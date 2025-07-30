#!/usr/bin/env ruby
# scripts/test_gen_events.rb
# Test harness for _plugins/gen_events.rb

require 'yaml'
require_relative '../_plugins/gen_events'

# Mock Jekyll site object
class MockSite
  attr_reader :source, :pages
  def initialize(source)
    @source = source
    @pages = []
  end
end

# Dummy Page class to capture instantiation
class Jekyll::Page
  attr_reader :site, :base, :dir, :name, :data
  def initialize(site, base, slug, event)
    @site = site
    @base = base
    @dir  = File.join('events-and-activities', slug)
    @name = 'index.html'
    @data = { 'slug' => slug, 'event' => event }
    puts "Generated page: #{@dir}/#{@name}"
  end
end

# Run generator
site = MockSite.new(Dir.pwd)
generator = Jekyll::EventPageGenerator.new
generator.generate(site)

puts "Total pages generated: #{site.pages.size}"
