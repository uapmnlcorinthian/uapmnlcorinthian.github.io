# _plugins/event_generator.rb

module Jekyll
  class EventPageGenerator < Generator
    safe true
    priority :low

    def generate(site)
      events = site.data['events']
      return unless events.is_a?(Array)

      events.each do |ev|
        slug = ev['slug'].to_s.strip
        next if slug.empty?

        # Target directory and filename within the final site
        dir  = File.join('events-and-activities', slug)
        name = 'index.html'

        # Create the page and add it to the site pages
        page = EventPage.new(site, site.source, ev, dir, name)
        site.pages << page
      end
    end
  end

  # A custom Page subclass to render an event record
  class EventPage < Page
    def initialize(site, base, ev, dir, name)
      @site   = site
      @base   = base
      @dir    = dir
      @name   = name

      process(name)
      read_yaml(File.join(base, '_layouts'), 'event.html')

      # Merge all event data into the page's `data` hash
      ev.each do |key, value|
        data[key] = value
      end

      # Ensure slug and title are set if missing
      data['slug']  ||= ev['slug']
      data['title'] ||= ev['title']
    end
  end
end
