const Class = require('./class');

class Banner extends Class {
  async get (bannerId) {
    const [banners, ] = await this.conn.query(`SELECT * FROM banner WHERE id=?`);
    if (banners.length) {
      const banner = banners[0];
      return banner;
    } else {
      return null;
    }
  }
  async getBanners (position) {
    let queryString = '';
    if (position) {
      queryString += `WHERE position = '${position}'`;
    }
    const query = `SELECT *
    FROM banner
    ${queryString}
    ORDER BY viewOrder ASC`;
    const [banners, ] = await this.conn.query(query);
    return banners;
  }
  async getCount (position) {
    const [banners, ] = await this.conn.query(`SELECT count(*) AS count FROM banner WHERE position=?`, [position]);
    return banners[0].count;
  }
  async create (data) {

  }
  async update (data) {

  }
  async remove (bannerId) {
    
  }
}

module.exports = Banner;