// config/s3Config.js
const { fromIni } = require("@aws-sdk/credential-provider-ini");
require("dotenv").config({ path: ".env.development" });
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to list all S3 buckets
const listS3Buckets = async () => {
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    console.log("✅ S3 Buckets:", response.Buckets);
  } catch (error) {
    console.error("❌ S3 Connection Error:", error);
  }
};

//listS3Buckets(); // Call this function to test the connection

module.exports = { s3Client, listS3Buckets };
