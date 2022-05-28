const { timezone } = require('../config');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault(timezone);
const pool = require('../middleware/database');
const hashCreate = require('../middleware/hash');
const TelegramBot = require('node-telegram-bot-api');
const flash = require('../middleware/flash');
const datetime = require('../middleware/datetime');
const pagination = require('../middleware/pagination');
const doAsync = require('../middleware/doAsync');

// Seo
exports.seoDashboard = doAsync(async (req, res, next) => {
  res.redirect('/order');
});

exports.seoDeposit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    if (method === 'GET') {
      res.render('layout', {
        type: `deposit`,
        pageTitle: `대시보드 - ${res.locals.setting.siteName}`,
      });
    } else if (method === 'POST') {
      const { point, type, depositor, receipt, receiptNumber, taxbillCompany, taxbillNumber } = req.body;
      const user = res.locals.user;
      const query = `INSERT INTO pointDeposit
      (pointDeposit_user_ID, point, type, depositor, receipt, reciptNumber, taxbillNumber, taxbillCompany)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      await conn.query(query, [user.id, point, type, depositor, receipt, receiptNumber, taxbillCompany, taxbillNumber]);
      res.render('layout', {
        type: `deposit`,
        pageTitle: `대시보드 - ${res.locals.setting.siteName}`,
        status: 'complete',
      });
    }
  } finally {
    conn.release();
  }
});

exports.seoOrder = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [services, ] = await conn.query(`SELECT * FROM pluginSeoService ORDER BY viewOrder`);
    if (services.length) {
      const service = services[0];
      res.redirect(`/order/${service.id}`);
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.seoOrderService = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { serviceId } = req.params;
    const [services, ] = await conn.query(`SELECT * FROM pluginSeoService ORDER BY viewOrder ASC, id ASC`);
    const packages = services.filter(s => s.type === 'package');
    const products = services.filter(s => s.type === 'product');
    const service = services.find(s => s.id === Number(serviceId));
    if (service) {
      res.render('layout', {
        type: `order`,
        pageTitle: `${service.title} - ${res.locals.setting.siteName}`,
        packages,
        products,
        service,
      });
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.seoHistory = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const user = res.locals.user;
    const pnQuery = `SELECT count(*) AS count FROM pluginSeoOrder`;
    const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
    const query = `SELECT o.*, u.uId AS uId, u.nickName AS nickName
    FROM pluginSeoOrder AS o
    LEFT JOIN user AS u
    ON o.pluginSeoOrder_user_ID = u.id
    WHERE o.pluginSeoOrder_user_ID = ?
    ORDER BY o.id DESC
    ${pn.queryLimit}`;
    const [orders, ] = await conn.query(query, [user.id]);
    orders.forEach(o => {
      o.datetime = datetime(o.createdAt);
    });
    res.render('layout', {
      type: `history`,
      pageTitle: `대시보드 - ${res.locals.setting.siteName}`,
      orders,
      pn,
    });
  } finally {
    conn.release();
  }
});

// Waffle
exports.waffleRanking = doAsync(async (req, res, next) => {
  const year = moment(new Date).format('YYYY');
  const month = moment(new Date).format('MM');
  const title = `커뮤니티 사이트 순위 ${year}년 ${month}월`;
  res.render('layout', {
    type: 'waffleRanking',
    pageTitle: `${title} - ${res.locals.setting.siteName}`,
    title,
  });
});

// Bitcoin
exports.calculator = doAsync(async (req, res, next) => {
  res.render('layout', {
    type: `calculator`,
    pageTitle: `비트코인 계산기 - ${res.locals.setting.siteName}`,
  });
});