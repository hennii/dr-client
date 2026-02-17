require "fileutils"

class LogService
  STREAM_MAP = {
    "thoughts" => "thoughts",
    "combat" => "combat",
    "arrivals" => "arrivals",
    "death" => "deaths",
  }

  KNOWN_STREAMS = %w[main thoughts combat arrivals deaths raw]

  def initialize(base_dir, char_name)
    @base_dir = base_dir
    @char_name = char_name
    @enabled = { "main" => true, "thoughts" => true }
    @files = {}
    @file_dates = {}
    @main_buffer = ""
    @mutex = Mutex.new
    FileUtils.mkdir_p(@base_dir)
  end

  def log_event(event)
    @mutex.synchronize do
      case event[:type]
      when "text"
        @main_buffer << (event[:text] || "") if @enabled["main"]
      when "line_break"
        flush_main_line
      when "prompt"
        flush_main_line
      when "stream"
        stream = STREAM_MAP[event[:id]]
        return unless stream && @enabled[stream]
        text = (event[:text] || "").strip
        write_line(stream, text) unless text.empty?
      end
    end
  end

  def log_command(text)
    @mutex.synchronize do
      return unless @enabled["main"]
      flush_main_line unless @main_buffer.empty?
      write_line("main", "> #{text}")
    end
  end

  def log_raw(line)
    @mutex.synchronize do
      return unless @enabled["raw"]
      write_raw("raw", line)
    end
  end

  def enable(stream)
    @mutex.synchronize { @enabled[stream] = true }
  end

  def disable(stream)
    @mutex.synchronize { @enabled.delete(stream) }
  end

  def enabled?(stream)
    @mutex.synchronize { !!@enabled[stream] }
  end

  def enabled_streams
    @mutex.synchronize { @enabled.keys }
  end

  def close
    @mutex.synchronize do
      @files.each_value { |f| f.close rescue nil }
      @files.clear
      @file_dates.clear
    end
  end

  private

  def flush_main_line
    return if @main_buffer.empty?
    return unless @enabled["main"]
    text = @main_buffer.strip
    @main_buffer = ""
    write_line("main", text) unless text.empty?
  end

  def write_line(stream, text)
    file = file_for(stream)
    timestamp = Time.now.strftime("%H:%M")
    file.puts("[#{timestamp}] #{text}")
    file.flush
  end

  def write_raw(stream, text)
    file = file_for(stream)
    file.puts(text)
    file.flush
  end

  def file_for(stream)
    today = Date.today.to_s
    if @file_dates[stream] != today
      @files[stream]&.close rescue nil
      @files.delete(stream)
      @file_dates[stream] = today
    end

    @files[stream] ||= begin
      filename = "#{stream}-#{@char_name}-#{today}.log"
      path = File.join(@base_dir, filename)
      File.open(path, "a")
    end
  end
end
