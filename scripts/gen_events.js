// scripts/gen_events.js
// Generate minimal stub Markdown files for each event slug in _data/events.yml

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const dataFile   = path.join(__dirname, '..', '_data', 'events.yml');
const outputDir  = path.join(__dirname, '..', 'events');

// Load YAML
let events;
try {
  const fileContents = fs.readFileSync(dataFile, 'utf8');
  events = yaml.load(fileContents);
} catch (e) {
  console.error('Error loading YAML:', e);
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate stub for each slug
Object.keys(events).forEach(slug => {
  const mdPath = path.join(outputDir, `${slug}.md`);
  const frontMatter = `---
layout: event
slug: ${slug}
permalink: /events-and-activities/${slug}/
---
`;

  fs.writeFileSync(mdPath, frontMatter, 'utf8');
  console.log(`Generated stub: events/${slug}.md`);
});
