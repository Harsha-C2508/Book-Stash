// Vercel serverless function entry point
// Loads the pre-built Express app bundle
const server = require("../dist/index.cjs");
module.exports = server.default || server;
