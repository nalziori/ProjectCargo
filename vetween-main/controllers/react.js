const { timezone } = require('../config');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault(timezone);
const pool = require('../middleware/database');
const hashCreate = require('../middleware/hash');
const doAsync = require('../middleware/doAsync');

// Waffle
exports.getMenus = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [menus, ] = await conn.query(`SELECT * FROM menu ORDER BY viewOrder ASC`);
    if (menus.length) {
      res.send(menus);
    } else {
      res.status(400).send('error');
    }
  } finally {
    conn.release();
  }
});