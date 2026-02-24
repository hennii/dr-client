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
      inventory: { worn: [], last_full_refresh: nil },
    }

    # Inv stream accumulator (worn items from pushStream id='inv')
    @inv_acc = []

    # Inv list parsing state machine
    @inv_list_parsing = false
    @inv_list_lines = []

    # Inv container parsing state machine
    @inv_container_parsing = false
    @inv_container_lines = []
    @inv_container_name = nil
  end

  # Returns array of derived events to broadcast (may be empty).
  def update(event)
    @mutex.synchronize do
      derived = []

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
      when "text"
        if event[:style] == "room_name"
          @state[:room]["title"] = event[:text]&.strip
        end
        handle_inv_text(event, derived)
      when "stream"
        if event[:id] == "percWindow"
          @state[:active_spells] = event[:text] || ""
        elsif event[:id] == "inv"
          text = event[:text].to_s.strip
          @inv_acc << text unless text == "Your worn items are:"
        end
      when "stream_clear"
        if event[:id] == "inv"
          worn_names = @inv_acc.dup
          @inv_acc = []
          # Merge with existing worn items: preserve loaded container contents for matching names
          existing_map = @state[:inventory][:worn].each_with_object({}) { |i, h| h[i[:name]] = i }
          worn = worn_names.map { |name| existing_map[name] || { name: name, items: nil } }
          @state[:inventory][:worn] = worn
          derived << { type: "inventory_worn", items: worn_names }
        end
      when "prompt"
        if @inv_list_parsing
          tree = parse_inv_list(@inv_list_lines)
          @state[:inventory][:worn] = tree
          @state[:inventory][:last_full_refresh] = Time.now.to_i
          @inv_list_parsing = false
          @inv_list_lines = []
          derived << { type: "inventory_full", tree: tree, last_full_refresh: @state[:inventory][:last_full_refresh] }
        end
        if @inv_container_parsing
          container_name = @inv_container_name
          items = @inv_container_lines.map(&:strip).reject { |l| l.empty? || l.start_with?("[") }
          # Update the matching worn item in state
          update_container_in_worn(@state[:inventory][:worn], container_name, items)
          @inv_container_parsing = false
          @inv_container_lines = []
          @inv_container_name = nil
          derived << { type: "inventory_container", container: container_name, items: items }
        end
      end

      derived
    end
  end

  def snapshot
    @mutex.synchronize { @state.dup }
  end

  def to_json
    snapshot.to_json
  end

  private

  def handle_inv_text(event, derived)
    text = event[:text].to_s

    # Detect start of inv list output
    if text.include?("rummage about your person, taking stock of your possessions")
      @inv_list_parsing = true
      @inv_list_lines = []
      # Cancel any in-progress container parse
      @inv_container_parsing = false
      @inv_container_name = nil
      @inv_container_lines = []
      return
    end

    # Detect "There's nothing inside a heavy farandine rucksack!"
    # The container name is in the message itself — no prior parsing state needed.
    if text.strip =~ /^There's nothing inside (?:a |an |some |the |your )?(.+?)!?\s*$/i
      container_name = $1.strip
      update_container_in_worn(@state[:inventory][:worn], container_name, [])
      @inv_container_parsing = false
      @inv_container_lines = []
      @inv_container_name = nil
      derived << { type: "inventory_container", container: container_name, items: [] }
      return
    end

    # Detect start of "inv <container>" output
    if text.strip =~ /^Inside (?:a |an |some |the )?(.+?), you see:/i
      @inv_container_parsing = true
      @inv_container_name = $1.strip
      @inv_container_lines = []
      # Cancel any in-progress inv list parse (shouldn't happen, but be safe)
      @inv_list_parsing = false
      @inv_list_lines = []
      return
    end

    # Accumulate inv list lines (must be mono mode)
    if @inv_list_parsing && event[:mono]
      @inv_list_lines << text
      return
    end

    # Accumulate container contents lines (not mono — inv <container> output is plain text)
    if @inv_container_parsing
      @inv_container_lines << text
    end
  end

  # Parse indented inv list output into a tree of { name:, items: } hashes.
  # 2-space indent = top-level worn item.
  # 5-space + dash = level-1 container item.
  # 8-space + dash = level-2 nested container item.
  def parse_inv_list(lines)
    stack = []  # stack[level] = current item at that nesting depth
    worn = []

    lines.each do |line|
      if line =~ /^  ([^ -].+)$/
        # 2-space top-level item (not a dash-prefixed sub-item)
        item = { name: $1.strip, items: nil }
        worn << item
        stack = [item]
      elsif line =~ /^( +)-(.+)$/
        # Dash-prefixed sub-item; level determined by leading space count
        spaces = $1.length
        level = (spaces - 2) / 3  # 5→1, 8→2, 11→3
        item = { name: $2.strip, items: nil }
        parent = stack[level - 1]
        if parent
          parent[:items] ||= []
          parent[:items] << item
        end
        stack[level] = item
        stack = stack[0..level]
      end
    end

    worn
  end

  # Recursively find a container by name and update its items list.
  def update_container_in_worn(worn, container_name, items)
    return unless worn
    worn.each do |item|
      stripped = item[:name].sub(/^(a|an|some|the) /i, "")
      if stripped == container_name
        item[:items] = items.map { |n| { name: n, items: nil } }
        return true
      end
      return true if update_container_in_worn(item[:items], container_name, items)
    end
    false
  end

  def parse_exp(skill, text)
    rank = nil
    percent = nil
    state = nil

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
