// services/awsConfig.js
const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config({ path: ".env.development" });

const configureAWS = () => {
  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.AWS_REGION
  ) {
    console.error("❌ AWS credentials are missing!");
    process.exit(1);
  }

  console.log("✅ AWS SDK successfully configured.");
};

// Export properly
module.exports = { configureAWS };
