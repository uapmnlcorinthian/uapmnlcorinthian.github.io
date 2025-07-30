#!/usr/bin/env ruby
# scripts/test_gen_events.rb
# Harness to test _plugins/gen_events.rb locally without Jekyll

require 'yaml'
require_relative '../_plugins/gen_events'

# Minimal stub classes to emulate Jekyll environment
def stub_jenkins
  module Jekyll
    def self.logger
      @logger ||= Logger.new($stdout)
    end
    class Generator; end
    class Page; end
  end
end

# Setup stub
require 'logger'
stub_jenkins

# Mock site for generator
class MockSite
  attr_reader :source, :pages
  def initialize(source)
    @source = source
    @pages = []
  end
end

# Run the generator
site = MockSite.new(Dir.pwd)
generator = Jekyll::EventPageGenerator.new
puts "Running EventPageGenerator..."
generator.generate(site)
puts "\nGenerated pages:" 
site.pages.each do |p|
  puts " - #{p.dir}/#{p.name}"
end
puts "Total: #{site.pages.size} pages generated."
