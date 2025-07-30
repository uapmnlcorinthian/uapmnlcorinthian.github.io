# _plugins/gen_events.rb
require 'yaml'
require 'base64'
require 'bigdecimal'
require 'fileutils'
require 'date'

Jekyll.logger.info "gen_events:", "Plugin loaded—converting events.yml to _events/*.md files…"

module Jekyll
  class EventPageGenerator < Generator
    safe true
    priority :highest

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

        frontmatter = event.map do |key, value|
          case key.to_s
          when 'content', 'map_embed'
            "#{key}: |\n" + value.to_s.lines.map { |l| "  #{l.chomp}" }.join("\n")
          when 'image_gallery'
            yaml_block = value.to_yaml.lines.map { |l| "  #{l}" }.join
            "#{key}: |\n#{yaml_block}"
          else
            "#{key}: #{value.inspect}"
          end
        end.join("\n")

        markdown = <<~MD
          ---
          #{frontmatter}
          ---
          
          #{event['content'] || ''}
        MD

        # Skip writing if file unchanged to prevent rebuild loops
        if File.exist?(file_path)
          existing = File.read(file_path)
          next if existing == markdown
        end

        File.write(file_path, markdown)
        Jekyll.logger.info "gen_events:", "Wrote #{file_path}"
      end
    end
  end
end
