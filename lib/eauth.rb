require "openssl"
require "socket"

module EAuth
  PACKET_SIZE = 8192

  def self.login(account:, password:, character:, game_code: "DR")
    conn = connect
    conn.puts "K\n"
    hashkey = conn.sysread(PACKET_SIZE)

    encrypted = xor_password(password, hashkey)
    conn.puts "A\t#{account}\t#{encrypted}\n"
    response = conn.sysread(PACKET_SIZE)
    unless response =~ /KEY\t/
      raise "Authentication failed: #{response.strip}"
    end

    conn.puts "M\n"
    response = conn.sysread(PACKET_SIZE)
    raise "M step failed: #{response}" unless response =~ /^M\t/

    conn.puts "F\t#{game_code}\n"
    response = conn.sysread(PACKET_SIZE)
    raise "F step failed: #{response}" unless response =~ /NORMAL|PREMIUM|TRIAL|INTERNAL|FREE/

    conn.puts "G\t#{game_code}\n"
    conn.sysread(PACKET_SIZE)

    conn.puts "P\t#{game_code}\n"
    conn.sysread(PACKET_SIZE)

    conn.puts "C\n"
    response = conn.sysread(PACKET_SIZE)

    char_code = response
      .sub(/^C\t[0-9]+\t[0-9]+\t[0-9]+\t[0-9]+[\t\n]/, "")
      .scan(/[^\t]+\t[^\t^\n]+/)
      .find { |c| c.split("\t")[1] == character }
      &.split("\t")&.first

    raise "Character '#{character}' not found" unless char_code

    conn.puts "L\t#{char_code}\tSTORM\n"
    response = conn.sysread(PACKET_SIZE)
    raise "L step failed: #{response}" unless response =~ /^L\t/

    conn.close unless conn.closed?

    login_info = response
      .sub(/^L\tOK\t/, "")
      .split("\t")
      .map { |kv| k, v = kv.split("="); [k.downcase, v] }
      .to_h

    {
      host: login_info["gamehost"],
      port: login_info["gameport"].to_i,
      key: login_info["key"],
    }
  end

  private

  def self.connect(hostname = "eaccess.play.net", port = 7910)
    tcp = TCPSocket.open(hostname, port)
    ctx = OpenSSL::SSL::SSLContext.new
    ctx.verify_mode = OpenSSL::SSL::VERIFY_NONE
    ssl = OpenSSL::SSL::SSLSocket.new(tcp, ctx)
    ssl.sync_close = true
    ssl.connect
    ssl
  end

  def self.xor_password(password, hashkey)
    pw_bytes = password.bytes
    hk_bytes = hashkey.bytes
    pw_bytes.each_index { |i| pw_bytes[i] = ((pw_bytes[i] - 32) ^ hk_bytes[i]) + 32 }
    pw_bytes.map(&:chr).join
  end
end
