require "json"

class GameState
  def initialize
    @mutex = Mutex.new
    @state = {
      vitals: {},
      room: {},
      compass: [],
      hands: { left: "Empty", right: "Empty" },
      spell: nil,
      indicators: {},
      char_name: nil,
      roundtime: nil,
      casttime: nil,
    }
  end

  def update(event)
    @mutex.synchronize do
      case event[:type]
      when "vitals"
        @state[:vitals][event[:id]] = event[:value]
      when "room"
        @state[:room][event[:field]] = event[:value]
      when "compass"
        @state[:compass] = event[:dirs]
      when "hands"
        @state[:hands] = { left: event[:left], right: event[:right] }
      when "spell"
        @state[:spell] = event[:name]
      when "indicator"
        @state[:indicators][event[:id]] = event[:visible]
      when "char_name"
        @state[:char_name] = event[:name]
      when "roundtime"
        @state[:roundtime] = event[:value]
      when "casttime"
        @state[:casttime] = event[:value]
      end
    end
  end

  def snapshot
    @mutex.synchronize { @state.dup }
  end

  def to_json
    snapshot.to_json
  end
end
