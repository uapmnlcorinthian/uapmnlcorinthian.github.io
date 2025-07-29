<!-- =============================
6. _plugins/ics_generator.rb
============================= -->
module Jekyll
  class ICSFile < Page
    def initialize(site, base, dir, event)
      slug = event['slug'] || event['title'].downcase.strip.gsub(' ', '-').gsub(/[^\w-]/, '')
      @site, @base, @dir = site, base, dir
      @name = "#{slug}.ics"

      self.process(@name)
      self.data = event.dup
      self.content = <<~ICS
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        DTSTART:#{event['event_date'].to_time.strftime('%Y%m%dT%H%M%S')}
        SUMMARY:#{event['title']}
        DESCRIPTION:#{event['content']}
        LOCATION:#{event['location']}
        END:VEVENT
        END:VCALENDAR
      ICS
    end
  end

  class ICSGenerator < Generator
    def generate(site)
      events = site.data['events'] || []
      events.each do |event|
        site.pages << ICSFile.new(site, site.source, 'ics', event)
      end
    end
  end
end