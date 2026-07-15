/*
  Consol log with Highlighted Log Type.
  *( Single argument Log.)
 */


const chalk = require("chalk");
const success = chalk.bgGreenBright;
const info = chalk.blueBright.bgWhiteBright;
const warning = chalk.yellowBright.bgYellowBright;
const error = chalk.redBright.bgRedBright;
const bgwhite = chalk.bgWhiteBright;

// const AWS = require("aws-sdk");

// const aws_config = {
//   accessKeyId: process.env.AWS_ACCESS_ID,
//   region: "ap-south-1",
//   secretAccessKey: process.env.AWS_ACCESS_KEY,
// };

// AWS.config.setPromisesDependency();
// AWS.config.update(aws_config);



const logg = {
  warning: function (text) {
    console.log(warning(" Warning "), text);
  },
  success: function (text) {
    console.log(success(" Success "), text);
  },
  info: function (text) {
    console.log(info(" Infomation "), text);
  },
  error: function (text) {
    console.log(error(" Error "), text);
  },
};

const keywordParser = (string) => {
  console.log("Keyword Parser : ", string);
  let keywordArray = string.split(' ')
  console.log(keywordArray)
  keywordArray.unshift(string);

  return keywordArray;
}
//Example
// const bucketName = 'eksathi';
// const region = 'ap-south-1';
// const folderName = 'public/images/avatars';

// function getObjectURL(bucket, region, key) {
//   return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
// }

// async function listObjectURLs(bucketName, region, folderName) {
//   const AWS = require('aws-sdk');
//   const s3 = new AWS.S3({ region });

//   const params = {
//     Bucket: bucketName,
//     Prefix: folderName + '/'
//   };

//   try {
//     const response = await s3.listObjectsV2(params).promise();
//     const objects = response.Contents;

//     // Extract the URLs from the objects
//     const objectURLs = objects.map(obj => {
//       const objectKey = obj.Key;
//       return getObjectURL(bucketName, region, objectKey);
//     });

//     return objectURLs;
//   } catch (err) {
//     console.error('Error:', err);
//     throw err;
//   }
// }

module.exports = {
  keywordParser,
  logg,
  
}


