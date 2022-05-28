const pool = require('../middleware/database');
const { isAdmin } = require('../middleware/permission');
const match = require('./match');

exports.addLog = async (req, location, articleId) => {
  if (!(req.session && req.session.user && req.session.user.permission === 10)) {
    const conn = await pool.getConnection();
    try {
      let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress || null;
      if (ip.match(match.ip)) {
        ip = ip.match(match.ip)[0];
      } else {
        ip = '127.0.0.1';
      }
      const referer = req.headers.referer;
      const userAgent = req.headers['user-agent'];
      if (articleId) {
        const query = `INSERT INTO log (log_article_ID, location, viewIp, referer, userAgent) VALUES (?, ?, ?, ?, ?)`;
        await conn.query(query, [articleId, location, ip, referer, userAgent]);
      } else {
        const query = `INSERT INTO log (location, viewIp, referer, userAgent) VALUES (?, ?, ?, ?)`;
        await conn.query(query, [location, ip, referer, userAgent]);
      }
    } finally {
      conn.release();
    }
  }
};