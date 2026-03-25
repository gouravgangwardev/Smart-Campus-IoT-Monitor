/**
 * AWS SDK v2 configuration for S3 operations
 * Used for:
 *   - Uploading hourly/daily energy reports (JSON + CSV)
 *   - Storing historical sensor snapshots for long-term analysis
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
 */

const AWS = require("aws-sdk");

// Configure the SDK once at module load
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "ap-south-1",
});

const s3 = new AWS.S3();
const BUCKET = process.env.S3_BUCKET_NAME || "smart-campus-reports";

/**
 * Upload a JSON or CSV report to S3
 * @param {string} key      - S3 object key, e.g. "reports/2024/hourly_14.json"
 * @param {string|Buffer} body - File content
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - Public URL of uploaded file
 */
const uploadReport = async (key, body, contentType = "application/json") => {
  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    // Reports are private; presigned URLs are generated when needed
    ACL: "private",
  };

  const result = await s3.upload(params).promise();
  return result.Location;
};

/**
 * Generate a presigned URL for temporary secure access to a report
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Seconds until URL expiry (default 1 hour)
 */
const getPresignedUrl = (key, expiresIn = 3600) => {
  return s3.getSignedUrl("getObject", {
    Bucket: BUCKET,
    Key: key,
    Expires: expiresIn,
  });
};

/**
 * List all report keys under a given prefix
 * @param {string} prefix - e.g. "reports/2024/"
 */
const listReports = async (prefix) => {
  const params = { Bucket: BUCKET, Prefix: prefix };
  const data = await s3.listObjectsV2(params).promise();
  return data.Contents.map((obj) => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
  }));
};

module.exports = { uploadReport, getPresignedUrl, listReports };
