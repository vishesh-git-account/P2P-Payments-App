const NodeCache = require("node-cache");
// Standard TTL (Time To Live) is 300 seconds (5 minutes)
const cache = new NodeCache({ stdTTL: 300 }); 

module.exports = cache;