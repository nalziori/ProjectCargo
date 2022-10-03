const fs = require('fs');
const pngToIco = require('png-to-ico');
const sharp = require('sharp');
const sizeOf = require('image-size');
const AWS = require('aws-sdk');
const imageUpload = require('./imageUpload');
const config = require('../middleware/config');
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

const faviconUpload = async (image, size, fileName) => {
  try {
    sharp(image.buffer).resize(size).toBuffer((err, data, info) => {
      const json = {
        originalname: `${size}.png`,
        buffer: data,
      }
      imageUpload(json, 'assets', fileName);
    });
  } catch (e) {
    console.error(e);
  }
};

const favicon = async (image) => {
  try {
    const imageSize = await sizeOf(image.buffer);
    if (imageSize.width >= 500 && imageSize.height >= 500 && imageSize.width === imageSize.height) {
      // 파비콘 생성
      const key = await imageUpload(image, 'assets');
      pngToIco(image.buffer)
        .then(async buffer => {
          const key = 'favicon.ico';
          const originalParams = {
            Bucket: bucket,
            Key: `assets/${key}`,
            ACL: 'public-read',
            Body: buffer,
            ContentType: 'image/ico',
          };
          s3.putObject(originalParams, (err, data) => {
            if (err) {
              console.error(err);
            }
          });
        })
        .catch(() => {
          console.error();
        });
      // apple-icon
      faviconUpload(image, 57, 'apple-icon-57x57.png');
      faviconUpload(image, 60, 'apple-icon-60x60.png');
      faviconUpload(image, 72, 'apple-icon-72x72.png');
      faviconUpload(image, 76, 'apple-icon-76x76.png');
      faviconUpload(image, 114, 'apple-icon-114x114.png');
      faviconUpload(image, 120, 'apple-icon-120x120.png');
      faviconUpload(image, 144, 'apple-icon-144x144.png');
      faviconUpload(image, 152, 'apple-icon-152x152.png');
      faviconUpload(image, 180, 'apple-icon-180x180.png');
      faviconUpload(image, 192, 'apple-icon-precomposed.png');
      faviconUpload(image, 192, 'apple-icon.png');
      // android-icon
      faviconUpload(image, 192, 'android-icon-192x192.png');
      faviconUpload(image, 144, 'android-icon-144x144.png');
      faviconUpload(image, 96, 'android-icon-96x96.png');
      faviconUpload(image, 72, 'android-icon-72x72.png');
      faviconUpload(image, 48, 'android-icon-48x48.png');
      faviconUpload(image, 36, 'android-icon-36x36.png');
      const manifest = {
        'name': 'App',
        'icons': [
          {
            'src': `${host}\/assets\/android-icon-36x36.png`,
            'sizes': '36x36',
            'type': 'image\/png',
            'density': '0.75',
          },
          {
            'src': `${host}\/assets\/android-icon-48x48.png`,
            'sizes': '48x48',
            'type': 'image\/png',
            'density': '1.0',
          },
          {
            'src': `${host}\/assets\/android-icon-72x72.png`,
            'sizes': '72x72',
            'type': 'image\/png',
            'density': '1.5',
          },
          {
            'src': `${host}\/assets\/android-icon-96x96.png`,
            'sizes': '96x96',
            'type': 'image\/png',
            'density': '2.0',
          },
          {
            'src': `${host}\/assets\/android-icon-144x144.png`,
            'sizes': '144x144',
            'type': 'image\/png',
            'density': '3.0',
          },
          {
            'src': `${host}\/assets\/android-icon-192x192.png`,
            'sizes': '192x192',
            'type': 'image\/png',
            'density': '4.0',
          },
        ],
      };
      const jsonKey = 'manifest.json';
      const originalParams = {
        Bucket: bucket,
        Key: `assets/${jsonKey}`,
        ACL: 'public-read',
        Body: JSON.stringify(manifest),
        ContentType: 'application/json',
        'Access-Control-Allow-Origin': '*'
      };
      s3.putObject(originalParams, (err, data) => {
        if (err) {
          console.error(err);
        }
      });
      // favicon
      faviconUpload(image, 32, 'favicon-32x32.png');
      faviconUpload(image, 96, 'favicon-96x96.png');
      faviconUpload(image, 16, 'favicon-16x16.png');
      // ms-icon
      faviconUpload(image, 310, 'ms-icon-310x310.png');
      faviconUpload(image, 150, 'ms-icon-150x150.png');
      faviconUpload(image, 144, 'ms-icon-144x144.png');
      faviconUpload(image, 70, 'ms-icon-70x70.png');
      return {
        status: true,
        key,
      };
    } else {
      return {
        status: false,
      }
    }
  } catch (e) {
    console.error(e);
  }
};

module.exports = favicon;