const morgan = require("morgan");

// Use "dev" format for colored concise logs (or use "combined" for detailed logs)
const logger = morgan("dev");

module.exports = logger;
