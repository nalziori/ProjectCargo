const Class = require('./class');

class Plugin extends Class {
  async getPlugins () {
    const [plugins, ] = await conn.query(`SELECT * FROM plugin ORDER BY id ASC`);
    return plugins;
  }
}

module.exports = Plugin;