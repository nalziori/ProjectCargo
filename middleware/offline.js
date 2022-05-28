const axios = require('axios');
const CryptoJS = require('crypto-js');
const pool = require('./database');

const geoLocationUrl = ``;
const geoCodingUrl = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode';

const getGeoLocation = async (ip) => {
  try {
    const conn = await pool.getConnection();
    try {
      return new Promise(async (resolve, reject) => {
        const [settings, ] = await conn.query(`SELECT * FROM setting`);
        const setting = settings[0];
        const { naverCloudPlatformAccessKeyId, naverCloudPlatformSecretKey } = setting;
        const requestMethod = 'GET';
        const hostName = 'https://geolocation.apigw.ntruss.com';
        const requestUrl = '/geolocation/v2/geoLocation';
        const timeStamp = Math.floor(+new Date).toString();
    
        const sortedSet = {};
        sortedSet['ip'] = ip;
        sortedSet['ext'] = 't';
        sortedSet['responseFormatType'] = 'json';
    
        let queryString = Object.keys(sortedSet).reduce((prev, curr) => {
          return prev + curr + '=' + sortedSet[curr] + '&';
        }, '');
    
        queryString = queryString.substr(0, queryString.length -1 );
    
        const baseString = requestUrl + '?' + queryString;
        const signature = makeSignature(naverCloudPlatformSecretKey, requestMethod, baseString, timeStamp, naverCloudPlatformAccessKeyId);
    
        const config = {
          headers: {
            'x-ncp-apigw-timestamp': timeStamp,
            'x-ncp-iam-access-key' : naverCloudPlatformAccessKeyId,
            'x-ncp-apigw-signature-v2': signature,
          },
        };
    
        axios.get(`${hostName}${baseString}`, config)
          .then(response => {
            const geoLocation = {
              latitude: response.data.geoLocation.lat,
              longitude: response.data.geoLocation.long,
            };
            resolve(geoLocation);
          })
          .catch(error => {
            // console.log(error.response.data);
            resolve(null);
          });
      });
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
  }
};

const getGeoCoding = async (address) => {
  try {
    const conn = await pool.getConnection();
    try {
      const [offlines, ] = await conn.query(`SELECT * FROM offline`);
      const offline = offlines[0];
      const result = await axios
        .get(geoCodingUrl, {
          params: {
            query: address,
          },
          headers: {
            'X-NCP-APIGW-API-KEY-ID': offline.naverApplicationClientId,
            'X-NCP-APIGW-API-KEY': offline.naverApplicationClientSecret,
          },
        })
      const data = result.data;
      if (data.addresses.length) {
        const latitude = data.addresses[0].y;
        const longitude = data.addresses[0].x;
        const geolocation = {
          latitude,
          longitude,
        }
        return geolocation;
      } else {
        return null;
      }
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
  }
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  if ((lat1 === lat2) && (lon1 === lon2))
      return 0;
  var radLat1 = Math.PI * lat1 / 180;
  var radLat2 = Math.PI * lat2 / 180;
  var theta = lon1 - lon2;
  var radTheta = Math.PI * theta / 180;
  var dist = Math.sin(radLat1) * Math.sin(radLat2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.cos(radTheta);
  if (dist > 1)
      dist = 1;

  dist = Math.acos(dist);
  dist = dist * 180 / Math.PI;
  dist = dist * 60 * 1.1515 * 1.609344 * 1000;
  if (dist < 100) dist = Math.round(dist / 10) * 10;
  else dist = Math.round(dist / 100) * 100;

  return dist;
}

const makeSignature = (secretKey, method, baseString, timestamp, accessKey) => {
  const space = ' ';
  const newLine = '\n';
  let hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);

  hmac.update(method);
  hmac.update(space);
  hmac.update(baseString);
  hmac.update(newLine);
  hmac.update(timestamp);
  hmac.update(newLine);
  hmac.update(accessKey);
  const hash = hmac.finalize();

  return hash.toString(CryptoJS.enc.Base64);
}

module.exports = {
  getGeoLocation,
  getGeoCoding,
  getDistance,
}