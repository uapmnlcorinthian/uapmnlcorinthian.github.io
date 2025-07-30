# _plugins/gen_events.rb
require 'yaml'
require 'fileutils'
require 'date'

Jekyll.logger.info "gen_events:", "Plugin loaded—converting events.yml to _events/*.md files…"

module Jekyll
  class EventPageGenerator < Generator
    safe true
    priority :low

    def generate(site)
      data_path = File.join(site.source, '_data', 'events.yml')
      Jekyll.logger.info "gen_events:", "Reading #{data_path}"
      return unless File.exist?(data_path)

      raw = File.read(data_path)
      events = YAML.safe_load(raw, permitted_classes: [Date], aliases: true)
      unless events.is_a?(Array)
        Jekyll.logger.warn "gen_events:", "events.yml is not an Array—skipping"
        return
      end

      events_dir = File.join(site.source, '_events')
      FileUtils.mkdir_p(events_dir)
      Jekyll.logger.info "gen_events:", "Ensured directory #{events_dir}"

      events.each do |event|
        slug = event['slug'] || event[:slug]
        next unless slug
        file_path = File.join(events_dir, "#{slug}.md")

        # Core front matter fields
        date_obj   = event['event_date'] || event[:event_date]
        date_str   = date_obj.respond_to?(:strftime) ? date_obj.strftime('%Y-%m-%d') : nil
        title      = event['title'] || event[:title] || slug
        permalink  = "/events-and-activities/#{slug}/"
        content_md = (event['content'] || '').strip

        # Base front matter
        front = {
          'layout'    => 'event',
          'title'     => title,
          'date'      => date_str,
          'permalink' => permalink,
          'content'   => content_md
        }

        # Merge additional fields (location, cover, registration_url, map_embed, image_gallery)
        event.each do |k, v|
          next if ['slug', 'event_date', 'title', 'content'].include?(k.to_s)
          front[k.to_s] = v
        end

        # Serialize front matter, quoting strings and handling blocks
        fm_lines = front.map do |key, val|
          if val.is_a?(String) && val.include?("\n")
            # multiline string (map_embed)
            "#{key}: |\n" + val.lines.map { |l| "  #{l.chomp}" }.join("\n")
          elsif val.is_a?(Array)
            # array as YAML block
            serialized = val.to_yaml
            "#{key}: |\n" + serialized.lines.map { |l| "  #{l.chomp}" }.join("\n")
          elsif val.is_a?(String)
            # quote simple strings
            "#{key}: #{val.inspect}"
          else
            # date or other types
            "#{key}: #{val}"
          end
        end

        # Final markdown (front matter only)
        markdown = <<~MD
          ---
          #{fm_lines.join("\n")}
          ---
        MD

        # Write if changed
        if File.exist?(file_path) && File.read(file_path) == markdown
          next
        end

        File.write(file_path, markdown)
        Jekyll.logger.info "gen_events:", "Wrote #{file_path}"
      end
    end
  end
end