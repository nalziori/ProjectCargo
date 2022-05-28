const Class = require('./class');

class Asset extends Class {
  async getAssets () {
    const [assets, ] = await this.conn.query(`SELECT * FROM assets ORDER BY id ASC`);
    return assets;
  }
}

module.exports = Asset;