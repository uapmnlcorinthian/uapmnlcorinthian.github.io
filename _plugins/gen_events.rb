# _plugins/gen_events.rb
require 'yaml'
require 'fileutils'
require 'date'

Jekyll.logger.info "gen_events:", "Registering after_reset hook to generate events…"

Jekyll::Hooks.register :site, :after_reset do |site|
  data_path  = File.join(site.source, '_data', 'events.yml')
  events_dir = File.join(site.source, '_events')

  unless File.exist?(data_path)
    Jekyll.logger.warn "gen_events:", "No events.yml found at #{data_path}"
    next
  end

  raw    = File.read(data_path)
  events = YAML.safe_load(raw, permitted_classes: [Date], aliases: true)
  unless events.is_a?(Array)
    Jekyll.logger.warn "gen_events:", "events.yml is not an Array—skipping"
    next
  end

  FileUtils.mkdir_p(events_dir)
  Jekyll.logger.info "gen_events:", "Ensured directory #{events_dir}"

  events.each do |event|
    slug      = event['slug'] || event[:slug]
    next unless slug
    file_path = File.join(events_dir, "#{slug}.md")

    # Build your front matter exactly as before...
    date_obj  = event['event_date']
    date_str  = date_obj.respond_to?(:strftime) ? date_obj.strftime('%Y-%m-%d') : nil
    title     = event['title'] || slug
    permalink = "/events-and-activities/#{slug}/"
    content   = (event['content'] || '').strip

    front = {
      'layout'    => 'event',
      'title'     => title,
      'date'      => date_str,
      'permalink' => permalink,
      'content'   => content
    }
    # merge other fields...
    event.each { |k,v| front[k.to_s]=v unless %w[slug event_date title content].include?(k.to_s) }

    # serialize front matter (stripping inner '---' from YAML blocks)
    fm = front.map do |key,val|
      if val.is_a?(String) && val.include?("\n")
        lines = val.lines.map(&:chomp)
        "#{key}: |\n" + lines.map { |l| "  #{l}" }.join("\n")
      elsif val.is_a?(Array)
        yaml = val.to_yaml.sub(/\A---\s*\n/, '')
        "#{key}: |\n" + yaml.lines.map { |l| "  #{l.chomp}" }.join("\n")
      else
        str = val.is_a?(String) ? val.inspect : val
        "#{key}: #{str}"
      end
    end.join("\n")

    markdown = <<~MD
      ---
      #{fm}
      ---
    MD

    if !File.exist?(file_path) || File.read(file_path) != markdown
      File.write(file_path, markdown)
      Jekyll.logger.info "gen_events:", "Wrote #{file_path}"
    end
  end
end
