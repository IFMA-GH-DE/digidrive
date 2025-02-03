const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize S3 Client (reuse across the app)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Generate Signed URL Function
const generateSignedUrl = async (fileKey) => {
  if (!fileKey) {
    throw new Error("Invalid fileKey: The file key must be provided.");
  }

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
  };

  try {
    console.log(`Generating signed URL for file: ${fileKey}`);
    const signedUrl = await getSignedUrl(s3, new GetObjectCommand(params), {
      expiresIn: 3600, // URL valid for 1 hour
    });

    console.log("Signed URL generated:", signedUrl);
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
};

// Export the function properly
module.exports = { generateSignedUrl };
