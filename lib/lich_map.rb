require "json"

# Loads Lich's DragonRealms map JSON and matches the current room title/desc/exits
# against it to produce a Lich room id — the same integer `Map.current_room.id`
# returns inside Lich, which kor-scripts pass to `go2`.
#
# Match algorithm mirrors lib/common/map/map_dr.rb#match_current in Lich5:
# title (double-bracketed) + description (exact text) + paths string.
class LichMap
  attr_reader :current_room_id

  def initialize(map_path)
    @map_path = map_path
    @rooms = []          # array of room hashes
    @by_title = {}       # title => [rooms]
    @by_uid = {}         # uid => [rooms]
    @current_room_id = nil
    @mutex = Mutex.new
  end

  def load
    raw = JSON.parse(File.read(@map_path))
    raw.each do |r|
      next unless r["title"] && r["description"] && r["paths"]
      room = {
        id: r["id"],
        titles: Array(r["title"]),
        descriptions: Array(r["description"]).map { |d| d.to_s.strip },
        paths: Array(r["paths"]).map { |p| p.to_s.strip },
        uids: Array(r["uid"]),
      }
      @rooms << room
      room[:titles].each { |t| (@by_title[t] ||= []) << room }
      room[:uids].each { |u| (@by_uid[u] ||= []) << room }
    end
    self
  end

  # title: stiletto's `state[:room]["title"]` text, e.g. "[Manor House, Pathway] (154103)"
  # desc/exits: room desc and exits text (HTML already stripped)
  def lookup(title:, desc: nil, exits: nil)
    return nil if title.nil? || title.empty?

    uid = title[/\((\d+)\)\s*$/, 1]&.to_i
    inner = title.sub(/\s*\(\d+\)\s*$/, "").strip  # "[Manor House, Pathway]"
    lich_title = "[#{inner}]"                       # "[[Manor House, Pathway]]"

    candidates = @by_title[lich_title] || []
    return nil if candidates.empty?

    # UID-aided shortcut: if Lich knows this uid and it points into our candidates, use that
    if uid && uid > 0 && (uid_rooms = @by_uid[uid])
      narrowed = uid_rooms & candidates
      return narrowed.first[:id] if narrowed.size == 1
      candidates = narrowed unless narrowed.empty?
    end

    desc_s = desc.to_s.strip
    exits_s = exits.to_s.strip

    # Exact title + description + exits
    if !desc_s.empty? && !exits_s.empty?
      hit = candidates.find { |r| r[:descriptions].include?(desc_s) && r[:paths].include?(exits_s) }
      return hit[:id] if hit
    end

    # Fallback: title + exits only (description sometimes has stray trailing punctuation)
    if !exits_s.empty?
      hit = candidates.find { |r| r[:paths].include?(exits_s) }
      return hit[:id] if hit
    end

    # Single-candidate title shortcut
    return candidates.first[:id] if candidates.size == 1

    nil
  end

  # Looks up the current room from a game_state snapshot. Strips HTML from desc/exits
  # and caches the result. Returns the room id (or nil if unmatched).
  def update_from_snapshot(snapshot)
    title = snapshot.dig(:room, "title")
    desc  = strip_html(snapshot.dig(:room, "desc"))
    exits = strip_html(snapshot.dig(:room, "exits"))
    id = lookup(title: title, desc: desc, exits: exits)
    @mutex.synchronize { @current_room_id = id } if id
    id
  end

  # Finds the most recently modified Lich DR map file under the standard Lich5 data dir.
  def self.latest_map_path(lich_data_dir = File.expand_path("~/dragonrealms/Lich5/data/DR"))
    files = Dir.glob(File.join(lich_data_dir, "map-*.json"))
    files.max_by { |f| File.mtime(f) }
  end

  private

  def strip_html(s)
    return "" if s.nil?
    s.gsub(/<[^>]+>/, "").gsub(/\s+/, " ").strip
  end
end
