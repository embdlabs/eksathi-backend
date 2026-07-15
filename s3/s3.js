const AWS = require("aws-sdk");

const aws_config = {
  accessKeyId: process.env.AWS_ACCESS_ID,
  region: "ap-south-1",
  secretAccessKey: process.env.AWS_ACCESS_KEY,
};


console.log("accessKeyId",process.env.AWS_ACCESS_ID)
console.log("secretAccessKey",process.env.AWS_ACCESS_KEY)

AWS.config.setPromisesDependency();
AWS.config.update(aws_config);


function getObjectURL(bucket, region, key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function listObjectURLs(bucketName, region, folderName) {
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3({ region });

  const params = {
    Bucket: bucketName,
    Prefix: folderName + '/'
  };

  try {
    const response = await s3.listObjectsV2(params).promise();
    const objects = response.Contents;

    // Extract the URLs from the objects
    const objectURLs = objects.map(obj => {
      const objectKey = obj.Key;
      return getObjectURL(bucketName, region, objectKey);
    });

    return objectURLs;
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }
}

module.exports = {
    listObjectURLs
}