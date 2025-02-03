// server.js
const http = require("http");
const app = require("./app");
const mongoose = require("mongoose");
const { configureAWS } = require("./services/awsConfig");

const {
  mongodb_connection_string,
  mongodb_connection,
} = require("./config/dbConnection");
const { s3Client, listS3Buckets } = require("./services/s3Client"); // Import S3 Client

const PORT = process.env.PORT || 7000;
//const MONGO_URI = process.env.MONGO_URI;

const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config({ path: ".env.development" });

// Start the server **only** when the DB connection is successful
const startServer = async () => {
  try {
    await mongodb_connection(); // Connect to MongoDB before starting the server

    configureAWS(); // AWS Configuration

    await listS3Buckets(); // Test S3 Connection
    console.log("✅ Connected to MongoDB", mongodb_connection_string);

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
  }
};

startServer();
