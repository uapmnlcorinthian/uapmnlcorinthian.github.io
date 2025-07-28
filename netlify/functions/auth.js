// CommonJS (simplest)
const s = require('netlify-cms-oauth-provider-node');
exports.handler = (e,c) => s({ backend: 'github' })(e,c);
