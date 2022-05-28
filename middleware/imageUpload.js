const path = require('path');
const sharp = require('sharp');
const sizeOf = require('image-size');
const AWS = require('aws-sdk');
const config = require('./config');

const s3Info = config.getS3();

const { accessKeyId, secretAccessKey, region, bucket, host, endpoint } = s3Info;

const spacesEndpoint = new AWS.Endpoint(endpoint);
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
});

const imageUpload = async (image, folder, fileName, size) => {
  try {
    return new Promise(async (resolve, reject) => {
      let extension = path.extname(image.originalname);
      if (extension === '.jpeg') extension = '.jpg';
      const str = Math.random().toString(36).substr(2,11);
      let key = null;
      if (fileName) {
        key = fileName;
      } else {
        key = `${Date.now().toString()}-${str}${extension.toLowerCase()}`;
      }
      let data = null;
      if (extension !== '.mp4') {
        const originalSize = sizeOf(image.buffer);
        if (extension !== '.gif' && extension !== '.svg') {
          if (size) {
            if (originalSize.width > size) {
              data = await sharp(image.buffer)
                .resize({ width: size })
                .withMetadata()
                .toBuffer();
            } else {
              data = await sharp(image.buffer)
                .withMetadata()
                .toBuffer();
            }
          } else {
            if (originalSize.width > 1280) {
              data = await sharp(image.buffer)
                .resize({ width: 1280 })
                .withMetadata()
                .toBuffer();
            } else {
              data = await sharp(image.buffer)
                .withMetadata()
                .toBuffer();
            }
          }
        } else {
          data = image.buffer;
        }
      } else {
        data = image.buffer;
      }
      
      const originalParams = {
        Bucket: bucket,
        Key: `${folder}/${key}`,
        ACL: 'public-read',
        Body: data,
        ContentType: image.mimetype,
      };
  
      s3.putObject(originalParams, (err, data) => {
        if (err) {
          console.error(err);
          reject(null);
        } else {
          resolve(key);
        }
      });
    });
  } catch (e) {
    console.error(e);
  }
};

module.exports = imageUpload;