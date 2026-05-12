require "socket"
require "json"

# Connects this Stiletto instance to the local buddy_broker, publishes our
# character's state, and mirrors every other connected character's state in
# memory for the ScriptApi to query.
#
# Wire protocol: newline-delimited JSON, see buddy_broker.rb.
class BuddyClient
  RECONNECT_BACKOFF = [1, 2, 5, 10].freeze  # seconds
  DEBOUNCE_INTERVAL = 0.1  # seconds; coalesces rapid-fire publishes

  def initialize(character:, host: "127.0.0.1", port: 49600)
    @character = character
    @host = host
    @port = port

    @mutex = Mutex.new
    @peers = {}            # character => { state:, updated_at: }
    @last_published = nil  # state hash we most recently sent
    @pending_state = nil   # most recent state queued by publish(); coalesced
    @change_listeners = [] # blocks invoked with (character, state, updated_at)

    @socket = nil
    @write_mutex = Mutex.new
    @reader_thread = nil
    @flush_thread = nil
    @running = false
  end

  def start
    @running = true
    @reader_thread = Thread.new { run_loop }
    @flush_thread = Thread.new { flush_loop }
  end

  def stop
    @running = false
    @socket&.close rescue nil
    @reader_thread&.join(2)
    @flush_thread&.join(2)
  end

  # Snapshot of a single peer's state (excluding ourselves).
  def peer_state(name)
    @mutex.synchronize { @peers[name]&.dup }
  end

  # Snapshot of all known peers.
  def peer_state_all
    @mutex.synchronize { @peers.transform_values(&:dup) }
  end

  def peer_names
    @mutex.synchronize { @peers.keys.dup }
  end

  # Queue our character's state for publishing. Coalesces rapid-fire calls;
  # the flush thread sends at most once per DEBOUNCE_INTERVAL, and only when
  # the state actually differs from what we last sent.
  def publish(state)
    return unless state.is_a?(Hash)
    @mutex.synchronize { @pending_state = deep_dup(state) }
  end

  # Register a callback fired when any peer's state changes (update or leave).
  # Block receives (character, state_or_nil, updated_at_or_nil). On leave, state is nil.
  def on_change(&block)
    @mutex.synchronize { @change_listeners << block }
  end

  private

  def run_loop
    backoff_idx = 0

    while @running
      begin
        log "Connecting to broker at #{@host}:#{@port}"
        @socket = TCPSocket.new(@host, @port)
        @socket.setsockopt(Socket::IPPROTO_TCP, Socket::TCP_NODELAY, 1)
        @socket.sync = true
        backoff_idx = 0

        send_msg({ op: "hello", character: @character })
        # Re-publish last known state on reconnect so peers don't see us as silent
        last = @mutex.synchronize do
          state = @last_published && deep_dup(@last_published)
          @last_published = nil  # force flush to send
          @pending_state = state if state
          state
        end

        read_loop(@socket)
      rescue Errno::ECONNREFUSED, Errno::ECONNRESET, Errno::EPIPE, IOError => e
        log "Connection error: #{e.class}: #{e.message}" if @running
      rescue => e
        log "Unexpected error: #{e.class}: #{e.message}" if @running
      ensure
        @socket&.close rescue nil
        @socket = nil
      end

      break unless @running

      # Clear peer mirror so stale state doesn't linger across a broker restart
      cleared = @mutex.synchronize do
        old = @peers
        @peers = {}
        old.keys
      end
      cleared.each { |name| fire_change(name, nil, nil) }

      delay = RECONNECT_BACKOFF[[backoff_idx, RECONNECT_BACKOFF.length - 1].min]
      backoff_idx += 1
      sleep delay
    end
  end

  def read_loop(sock)
    while (line = sock.gets("\n"))
      line = line.chomp
      next if line.empty?
      msg = begin
        JSON.parse(line)
      rescue JSON::ParserError => e
        log "Bad JSON from broker: #{e.message}"
        next
      end
      handle_message(msg)
    end
  end

  def handle_message(msg)
    case msg["op"]
    when "snapshot"
      peers = msg["peers"] || {}
      changed = []
      @mutex.synchronize do
        @peers = {}
        peers.each do |name, entry|
          @peers[name] = { state: entry["state"], updated_at: entry["updated_at"] }
          changed << [name, entry["state"], entry["updated_at"]]
        end
      end
      changed.each { |args| fire_change(*args) }
    when "update"
      name = msg["character"]
      state = msg["state"]
      updated_at = msg["updated_at"]
      return unless name
      @mutex.synchronize { @peers[name] = { state: state, updated_at: updated_at } }
      fire_change(name, state, updated_at)
    when "leave"
      name = msg["character"]
      return unless name
      @mutex.synchronize { @peers.delete(name) }
      fire_change(name, nil, nil)
    else
      log "Unknown op from broker: #{msg['op'].inspect}"
    end
  end

  def fire_change(name, state, updated_at)
    listeners = @mutex.synchronize { @change_listeners.dup }
    listeners.each do |cb|
      begin
        cb.call(name, state, updated_at)
      rescue => e
        log "on_change listener error: #{e.class}: #{e.message}"
      end
    end
  end

  def flush_loop
    while @running
      sleep DEBOUNCE_INTERVAL
      state_to_send = nil
      @mutex.synchronize do
        if @pending_state && @pending_state != @last_published
          state_to_send = @pending_state
          @last_published = deep_dup(@pending_state)
        end
        @pending_state = nil
      end
      send_msg({ op: "publish", state: state_to_send }) if state_to_send
    end
  end

  def send_msg(msg)
    @write_mutex.synchronize do
      sock = @socket
      return unless sock
      sock.write(msg.to_json + "\n")
    end
  rescue IOError, Errno::ECONNRESET, Errno::EPIPE
    # Will be picked up by the read loop and trigger reconnect
  end

  def deep_dup(obj)
    JSON.parse(obj.to_json)
  end

  def log(msg)
    puts "[#{Time.now.strftime('%H:%M:%S')}] [buddy_client] #{msg}"
  end
end
