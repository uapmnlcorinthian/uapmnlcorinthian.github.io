# _plugins/gen_events.rb
require 'yaml'

Jekyll.logger.info "gen_events:", "Plugin loaded—scanning events.yml…"

module Jekyll
  class EventPageGenerator < Generator
    safe true
    priority :low

    def generate(site)
      data_path = File.join(site.source, '_data', 'events.yml')
      Jekyll.logger.info "gen_events:", "Looking for #{data_path}"
      return unless File.exist?(data_path)

      events = YAML.load_file(data_path)
      unless events.is_a?(Array)
        Jekyll.logger.warn "gen_events:", "events.yml is not an Array—skipping"
        return
      end
      Jekyll.logger.info "gen_events:", "Found #{events.size} events—generating pages."

      events.each do |event|
        slug = event['slug'] || event[:slug]
        next unless slug
        site.pages << EventPage.new(site, site.source, slug.to_s, event)
      end
    end
  end

  class EventPage < Page
    def initialize(site, base, slug, event)
      @site = site
      @base = base
      @dir  = File.join('events-and-activities', slug)
      @name = 'index.html'

      process(@name)
      read_yaml(File.join(base, '_layouts'), 'event.html')
      data['slug']  = slug
      data['event'] = event
      Jekyll.logger.info "gen_events:", "Created page for slug '#{slug}' at #{@dir}/#{@name}"
    end
  end
end
