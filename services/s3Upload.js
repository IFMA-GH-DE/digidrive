// services/s3Upload.js
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
require("dotenv").config({ path: ".env.development" });
//const s3Client = require("../services/s3Client");
//const s3 = new S3Client({ region: process.env.AWS_REGION });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.uploadToS3 = async (file) => {
  const key = `${Date.now()}-${file.originalname}`;
  //const key = `${Date.now()}-${file.originalname}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };
  await s3Client.send(new PutObjectCommand(params));
  return {
    Key: key,
    Location: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
};

//Deleting files from S3
exports.deleteFromS3 = async (fileKey) => {
  const params = { Bucket: process.env.S3_BUCKET_NAME, Key: fileKey };
  await s3Client.send(new DeleteObjectCommand(params));
};
