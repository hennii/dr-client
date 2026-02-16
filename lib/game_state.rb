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
      exp: {},
      active_spells: "",
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
      when "exp"
        skill = event[:skill]
        text = event[:text] || ""
        parsed = parse_exp(skill, text)
        @state[:exp][skill] = parsed
      when "stream"
        if event[:id] == "percWindow"
          @state[:active_spells] = event[:text] || ""
        end
      end
    end
  end

  def snapshot
    @mutex.synchronize { @state.dup }
  end

  def to_json
    snapshot.to_json
  end

  private

  def parse_exp(skill, text)
    # Exp text looks like: "       Evasion:    342 88% attentive    " or similar
    rank = nil
    percent = nil
    state = nil

    # Extract rank (first number), percent (number followed by %), and learning state (last word)
    if text =~ /(\d+)\s+(\d+)%\s+(\S+.*)$/
      rank = $1.to_i
      percent = $2.to_i
      state = $3.strip
    elsif text =~ /(\d+)\s+(\d+)%/
      rank = $1.to_i
      percent = $2.to_i
    end

    { text: text, rank: rank, percent: percent, state: state }
  end
end
