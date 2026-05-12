#!/usr/bin/env ruby
# Standalone broker that fans out per-character state between Stiletto instances.
# Each Stiletto connects, sends a `hello`, then publishes its own state and
# receives updates whenever any other connected character publishes.
#
# Wire protocol: newline-delimited JSON, one object per line.
#   client -> broker: {"op":"hello","character":"Name"}
#                     {"op":"publish","state":{...}}
#                     {"op":"bye"}
#   broker -> client: {"op":"snapshot","peers":{"Name":{"state":...,"updated_at":...},...}}
#                     {"op":"update","character":"Name","state":{...},"updated_at":...}
#                     {"op":"leave","character":"Name"}

require "socket"
require "json"
require "time"

class BuddyBroker
  DEFAULT_PORT = 49600

  def initialize(port: DEFAULT_PORT, host: "127.0.0.1")
    @port = port
    @host = host
    @server = nil
    @mutex = Mutex.new
    @peers = {}        # character => { state:, updated_at: }
    @connections = {}  # character => socket
  end

  def start
    begin
      @server = TCPServer.new(@host, @port)
      @server.setsockopt(Socket::SOL_SOCKET, Socket::SO_REUSEADDR, true)
    rescue Errno::EADDRINUSE
      log "Port #{@port} already bound; another broker is running. Exiting."
      return
    end
    log "Listening on #{@host}:#{@port}"

    loop do
      client = @server.accept
      client.setsockopt(Socket::IPPROTO_TCP, Socket::TCP_NODELAY, 1)
      client.sync = true
      Thread.new(client) { |c| handle_client(c) }
    end
  rescue Interrupt
    log "Interrupted, shutting down"
  ensure
    @server&.close rescue nil
  end

  private

  def handle_client(client)
    character = nil

    while (line = client.gets("\n"))
      line = line.chomp
      next if line.empty?

      msg = parse_json(line)
      next unless msg

      op = msg["op"]

      if character.nil?
        unless op == "hello" && msg["character"].is_a?(String) && !msg["character"].empty?
          log "Rejecting connection: first message must be hello with character"
          break
        end
        character = msg["character"]
        on_hello(character, client)
        next
      end

      case op
      when "publish"
        on_publish(character, msg["state"])
      when "bye"
        break
      when "hello"
        # Re-hello on the same connection is ignored
      else
        log "Unknown op from #{character}: #{op.inspect}"
      end
    end
  rescue IOError, Errno::ECONNRESET, Errno::EPIPE
    # Client disconnected
  rescue => e
    log "Client error (#{character || 'pre-hello'}): #{e.class}: #{e.message}"
  ensure
    on_leave(character, client) if character
    client.close rescue nil
  end

  def on_hello(character, client)
    snapshot_peers = nil
    displaced = nil

    @mutex.synchronize do
      displaced = @connections[character]
      @connections[character] = client
      # Build snapshot of *other* peers' current state
      snapshot_peers = @peers.reject { |k, _| k == character }
    end

    if displaced
      log "Displacing prior connection for #{character}"
      displaced.close rescue nil
    end

    log "Hello from #{character} (#{snapshot_peers.size} peer(s) known)"
    send_msg(client, { op: "snapshot", peers: snapshot_peers })
  end

  def on_publish(character, state)
    return unless state.is_a?(Hash)
    updated_at = now_ms

    @mutex.synchronize do
      @peers[character] = { state: state, updated_at: updated_at }
    end

    broadcast_except(character, { op: "update", character: character, state: state, updated_at: updated_at })
  end

  def on_leave(character, client)
    removed = false
    @mutex.synchronize do
      # Only remove if the stored socket is the same one disconnecting
      # (avoids race where a replacement connection's close triggers a leave)
      if @connections[character].equal?(client)
        @connections.delete(character)
        @peers.delete(character)
        removed = true
      end
    end

    return unless removed
    log "Leave from #{character}"
    broadcast_except(character, { op: "leave", character: character })
  end

  def broadcast_except(skip_character, msg)
    targets = nil
    @mutex.synchronize { targets = @connections.reject { |k, _| k == skip_character }.values.dup }
    targets.each { |sock| send_msg(sock, msg) }
  end

  def send_msg(sock, msg)
    sock.write(msg.to_json + "\n")
  rescue IOError, Errno::ECONNRESET, Errno::EPIPE
    # Will be cleaned up when handle_client exits
  end

  def parse_json(line)
    JSON.parse(line)
  rescue JSON::ParserError => e
    log "Bad JSON: #{e.message}"
    nil
  end

  def now_ms
    (Time.now.to_f * 1000).to_i
  end

  def log(msg)
    puts "[#{Time.now.strftime('%H:%M:%S')}] [buddy_broker] #{msg}"
    $stdout.flush
  end
end

if __FILE__ == $0
  port = (ENV["BUDDY_BROKER_PORT"] || BuddyBroker::DEFAULT_PORT).to_i
  BuddyBroker.new(port: port).start
end
