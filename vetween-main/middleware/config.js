const configJson = require('../config.json');

class Config {
  constructor () {
    if (process.env.NODE_ENV === 'development') {
      this.sql = configJson.sql.development;
      this.s3 = configJson.s3.development;
    } else {
      this.sql = configJson.sql.production;
      this.s3 = configJson.s3.production;
    }
    this.lang = configJson.language;
  }
  getS3 () {
    return this.s3;
  }
  getDatabase () {
    return this.sql;
  }
  getLang () {
    return this.lang;
  }
}

const config = new Config();

module.exports = config;