require 'yaml'
require 'fileutils'
require 'date'

Jekyll.logger.info "gen_events:", "Registering after_reset hook to generate events…"

Jekyll::Hooks.register :site, :after_reset do |site|
  data_path  = File.join(site.source, '_data', 'events.yml')
  events_dir = File.join(site.source, '_events')

  unless File.exist?(data_path)
    Jekyll.logger.warn "gen_events:", "No events.yml at #{data_path}"
    next
  end

  events = YAML.safe_load(File.read(data_path), permitted_classes: [Date], aliases: true)
  unless events.is_a?(Array)
    Jekyll.logger.warn "gen_events:", "events.yml is not an Array"
    next
  end

  FileUtils.mkdir_p(events_dir)
  Jekyll.logger.info "gen_events:", "Ensured directory #{events_dir}"

  # include event_date so we can emit "TBA" if needed
  keys = %w[event_date layout title date permalink start_time end_time location cover registration_url map_embed image_gallery]

  events.each do |event|
    # skip if explicitly unpublished
    if event.key?('published') && event['published'] == false
      next
    end

    slug = event['slug'] || event[:slug]
    next unless slug

    file_path = File.join(events_dir, "#{slug}.md")

    # prepare the raw date value (may be a Date or a String)
    date_val = event['event_date']
    date_str = if date_val.respond_to?(:strftime)
                 date_val.strftime('%Y-%m-%d')
               else
                 date_val.to_s
               end

    front = {
      'layout'    => 'event',
      'title'     => event['title'] || slug,
      'permalink' => "/events-and-activities/#{slug}/"
    }

    # *** TWEAK HERE ***
    # if no date or blank or explicitly "TBA", emit event_date: "TBA"
    if date_str.nil? || date_str.strip == '' || date_str.strip.upcase == 'TBA'
      front['event_date'] = 'TBA'
    else
      front['date'] = date_str
    end

    # build front-matter lines
    fm_lines = []
    keys.each do |key|
      value = front[key] || event[key] || event[key.to_sym]
      next if value.nil? || value == ''

      if key == 'map_embed' && value.include?("\n")
        fm_lines << "map_embed: |"
        value.lines.each { |line| fm_lines << "  #{line.chomp}" }
      elsif key == 'image_gallery' && value.is_a?(Array)
        fm_lines << "image_gallery:"
        value.each do |item|
          fm_lines << "  - img: #{item['img'].inspect}"
          fm_lines << "    caption: #{item['caption'].inspect}"
        end
      else
        fm_lines << "#{key}: #{value.inspect}"
      end
    end

    # content body
    content_body = (event['content'] || '').rstrip

    # assemble the markdown file
    markdown = ["---", *fm_lines, "---", "", content_body].join("\n")

    # write only if changed
    if !File.exist?(file_path) || File.read(file_path) != markdown
      File.write(file_path, markdown)
      Jekyll.logger.info "gen_events:", "Wrote #{file_path}"
    end
  end
end
