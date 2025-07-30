source "https://rubygems.org"

# Use GitHub Pages-compatible Jekyll plugins (overrides Jekyll core version)
#gem "github-pages", "~> 232", group: :jekyll_plugins

gem "jekyll", "~> 3.10"          # if you haven’t already removed `github-pages`
gem "base64"
gem "bigdecimal"
gem "jekyll-feed"
gem "jekyll-sitemap"
gem "jekyll-seo-tag"         
gem "jekyll-minifier"
gem "jekyll-include-cache"
gem "kramdown-parser-gfm"

# Optional enhancements
gem "logger"                  # Only if you use custom Ruby logging
gem "fiddle"                  # Required by some gems on Windows
gem "wdm", ">= 0.1.0" if Gem.win_platform?  # Optional: watch support for Windows

group :windows do
  gem "tzinfo-data"           # Safe cross-platform setup
end

group :jekyll_plugins do
  gem "jekyll-datapage-generator"
end
