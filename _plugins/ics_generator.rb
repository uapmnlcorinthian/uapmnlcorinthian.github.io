# _plugins/ics_generator.rb
# Generates ICS calendar files for events

require 'date'
require 'fileutils'

module Jekyll
  class ICSFile < Page
    def initialize(site, base, dir, event)
      # build slug
      slug = event['slug'] || event['title'].downcase.strip
                 .gsub(' ', '-').gsub(/[^\w-]/, '')
      @site, @base, @dir = site, base, dir
      @name = "#{slug}.ics"

      # safely determine DTSTART
      raw_date   = event['event_date']
      dtstart_str = nil

      if raw_date.respond_to?(:to_time)
        dtstart_str = raw_date.to_time.utc.strftime('%Y%m%dT%H%M%SZ')
      elsif raw_date.to_s =~ /^\d{4}-\d{2}-\d{2}/
        # parse ISO-date strings like "2025-08-06"
        dt = Date.parse(raw_date.to_s)
        dtstart_str = dt.to_time.utc.strftime('%Y%m%dT%H%M%SZ')
      end

      # build ICS body lines
      lines = []
      lines << "BEGIN:VCALENDAR"
      lines << "VERSION:2.0"
      lines << "BEGIN:VEVENT"
      lines << "DTSTART:#{dtstart_str}" if dtstart_str
      lines << "SUMMARY:#{event['title']}"
      lines << "DESCRIPTION:#{event['content']}"
      lines << "LOCATION:#{event['location']}"
      lines << "END:VEVENT"
      lines << "END:VCALENDAR"
      ics_body = lines.join("\r\n")

      # finalize page
      self.process(@name)
      self.data    = event.dup
      self.content = ics_body
    end
  end

  class ICSGenerator < Generator
    safe true
    priority :low

    def generate(site)
      events = site.data['events'] || []
      events.each do |event|
        site.pages << ICSFile.new(site, site.source, 'ics', event)
      end
    end
  end
end
