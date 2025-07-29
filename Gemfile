source "https://rubygems.org"

# Use GitHub Pages-compatible Jekyll plugins (overrides Jekyll core version)
gem "github-pages", "~> 232", group: :jekyll_plugins

# Optional enhancements
gem "jekyll-minifier"         # Compresses HTML, JS, and CSS
gem "logger"                  # Only if you use custom Ruby logging
gem "fiddle"                  # Required by some gems on Windows
gem "wdm", ">= 0.1.0" if Gem.win_platform?  # Optional: watch support for Windows

group :windows do
  gem "tzinfo-data"           # Safe cross-platform setup
end

group :jekyll_plugins do
  gem "jekyll-datapage-generator"
end
