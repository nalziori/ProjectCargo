const { timezone } = require('../config');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault(timezone);

const pool = require('../middleware/database');

class Count {
  constructor () {

  }
  async getCount () {
    const conn = await pool.getConnection();
    try {
      const todayQuery = `SELECT count(distinct viewIp) AS today
      FROM log
      WHERE viewDate >= date_format(CONVERT_TZ(NOW(),@@session.time_zone,'+09:00'), '%Y-%m-%d');`;
      const yesterdayQuery = `SELECT count(distinct viewIp) AS yesterday
      FROM log
      WHERE viewDate >= date_format(date_add(CONVERT_TZ(NOW(),@@session.time_zone,'+09:00'), interval -1 day), '%Y-%m-%d')
      AND viewDate < date_format(CONVERT_TZ(NOW(),@@session.time_zone,'+09:00'), '%Y-%m-%d');`;
      const monthQuery = `SELECT count(distinct viewIp) AS month
      FROM log
      WHERE viewDate >= date_format(date_add(CONVERT_TZ(NOW(),@@session.time_zone,'+09:00'), interval -1 month), '%Y-%m-%d');`;
      const [today, ] = await conn.query(todayQuery);
      const [yesterday, ] = await conn.query(yesterdayQuery);
      const [month, ] = await conn.query(monthQuery);
      return {
        today: today[0].today,
        yesterday: yesterday[0].yesterday,
        month: month[0].month,
      }
    } finally {
      conn.release();
    }
  }
}

module.exports = new Count();