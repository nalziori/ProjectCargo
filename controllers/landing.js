const { timezone } = require('../config');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault(timezone);
const pool = require('../middleware/database');
const { addLog } = require('../middleware/addlog');
const doAsync = require('../middleware/doAsync');

exports.index = doAsync(async (req, res, next) => {
  const index = res.locals.setting.index;
  if (index === 'landing') {
    const conn = await pool.getConnection();
    try {
      const [landingResult, ] = await conn.query(`SELECT * FROM landing ORDER BY id DESC LIMIT 1`);
      const landing = landingResult[0];
      addLog(req, `/`);
      res.render(`landing`, {
        pageTitle: `${res.locals.setting.siteName}`,
        landing,
      });
    } finally {
      conn.release();
    }
  } else {
    next();
  }
});