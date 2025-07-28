// CommonJS variant (no ESM config needed)
const serverless = require('netlify-cms-oauth-provider-node');
exports.handler = (event, context) =>
  serverless({ backend: 'github' })(event, context);
