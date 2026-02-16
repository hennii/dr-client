require "bundler/setup"
require "sinatra/base"
require "faye/websocket"
require "json"
require "open3"
require "dotenv"

Dotenv.load

require_relative "lib/eauth"
require_relative "lib/lich_launcher"
require_relative "lib/game_connection"
require_relative "lib/xml_parser"
require_relative "lib/game_state"
require_relative "lib/script_api"

Faye::WebSocket.load_adapter("thin")

class GameApp < Sinatra::Base
  set :server, :thin
  set :port, 4567
  set :bind, "0.0.0.0"

  # Serve built frontend
  set :public_folder, File.join(__dir__, "frontend", "dist")

  # WebSocket clients
  @@ws_clients = []
  @@ws_mutex = Mutex.new
  @@game_connection = nil
  @@game_state = GameState.new
  @@script_api = nil
  @@event_batch = []
  @@batch_mutex = Mutex.new
  @@flush_scheduled = false

  get "/" do
    send_file File.join(settings.public_folder, "index.html")
  end

  get "/ws" do
    return [400, {}, ["Not a WebSocket request"]] unless Faye::WebSocket.websocket?(env)

    ws = Faye::WebSocket.new(env)

    ws.on :open do |_event|
      puts "[ws] Client connected"
      @@ws_mutex.synchronize { @@ws_clients << ws }
      # Send current state snapshot
      ws.send({ type: "snapshot", state: @@game_state.snapshot }.to_json)
    end

    ws.on :message do |event|
      data = JSON.parse(event.data) rescue nil
      if data && data["type"] == "command" && data["text"]
        puts "[ws] Command: #{data['text']}"
        @@game_connection&.send_command(data["text"])
      end
    end

    ws.on :close do |_event|
      puts "[ws] Client disconnected"
      @@ws_mutex.synchronize { @@ws_clients.delete(ws) }
    end

    ws.rack_response
  end

  def self.broadcast(event_hash)
    @@batch_mutex.synchronize do
      @@event_batch << event_hash
      unless @@flush_scheduled
        @@flush_scheduled = true
        # Flush batch on next EventMachine tick (sub-millisecond grouping)
        EventMachine.next_tick { flush_batch }
      end
    end
  end

  def self.flush_batch
    batch = nil
    @@batch_mutex.synchronize do
      batch = @@event_batch
      @@event_batch = []
      @@flush_scheduled = false
    end
    return if batch.empty?

    json = batch.to_json
    @@ws_mutex.synchronize do
      @@ws_clients.each do |ws|
        ws.send(json) rescue nil
      end
    end
  end

  def self.boot!
    account  = ENV["DR_USERNAME"]  || abort("Set DR_USERNAME in .env or environment")
    password = ENV["DR_PASSWORD"]  || abort("Set DR_PASSWORD in .env or environment")
    character = ENV["DR_CHARACTER"] || abort("Set DR_CHARACTER in .env or environment")
    game_code = ENV["DR_GAME_CODE"] || "DR"

    # Step 1: eAuth
    puts "=== Authenticating with eAccess ==="
    login = EAuth.login(
      account: account,
      password: password,
      character: character,
      game_code: game_code,
    )
    puts "  Host: #{login[:host]}"
    puts "  Port: #{login[:port]}"
    puts "  Key:  #{login[:key][0..8]}..."

    # Step 2: Launch Lich
    puts "\n=== Launching Lich ==="
    lich_port = LichLauncher.launch(
      host: login[:host],
      port: login[:port],
      key: login[:key],
      game_code: game_code,
    )

    # Step 3: Set up XML parser
    parser = XmlParser.new
    parser.on_event = ->(event) do
      @@game_state.update(event)
      broadcast(event)
    end

    # Step 4: Connect to Lich
    puts "\n=== Connecting to game via Lich ==="
    @@game_connection = GameConnection.new(
      host: "127.0.0.1",
      port: lich_port,
      key: login[:key],
      parser: parser,
    )
    @@game_connection.connect

    # Step 5: Start ScriptApiServer for kor-scripts
    puts "\n=== Starting ScriptApiServer ==="
    @@script_api = ScriptApiServer.new(
      port: 49167,
      game_state: @@game_state,
      on_window_event: ->(event) { broadcast(event) },
      on_command: ->(cmd) { @@game_connection.send_command(cmd) },
    )
    @@script_api.start

    # Step 6: Cleanup on shutdown
    at_exit do
      puts "\n=== Shutting down ==="
      @@script_api&.stop
      @@game_connection&.close
      LichLauncher.shutdown
    end

    # Step 7: Start web server
    puts "\n=== Starting web server on http://localhost:4567 ==="
    run!
  end
end

GameApp.boot! if __FILE__ == $0
