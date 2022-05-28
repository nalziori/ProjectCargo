const { timezone } = require('../config');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault(timezone);
const pool = require('../middleware/database');
const pagination = require('../middleware/pagination');
const datetime = require('../middleware/datetime');
const returnBoards = require('../middleware/returnBoards');
const doAsync = require('../middleware/doAsync');

exports.index = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const index = res.locals.setting.index;
    if (index === 'offline') {
      const boards = await returnBoards('index');
      const [cities, ] = await conn.query(`SELECT * FROM offlineCity`);
      const [provinces, ] = await conn.query(`SELECT * FROM offlineProvince`);
      const { stores } = await getStores(req, res, null, null, null, null, 10);
      res.render('layout', {
        pageTitle: `${res.locals.setting.siteName}`,
        type: 'index',
        stores,
        cities,
        provinces,
        boards,
      });
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.around = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { filter, align, page } = req.query;
    const [types, ] = await conn.query(`SELECT * FROM offlineType WHERE filter = 1 ORDER BY viewOrder ASC, id ASC`);
    const { stores, pn } = await getStores(req, res, align, filter, null);
    res.render('layout', {
      pageTitle: `스토어 - ${res.locals.setting.siteName}`,
      type: 'around',
      stores,
      pn,
      types,
      filter,
      align,
      page,
    });
  } finally {
    conn.release();
  }
});

exports.location = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { city, province, align, filter, keyword, page } = req.query;
    const location = { city, province };
    const [cities, ] = await conn.query(`SELECT * FROM offlineCity ORDER BY viewOrder ASC, id ASC`);
    const [provinceRaws, ] = await conn.query(`SELECT * FROM offlineProvince ORDER BY viewOrder ASC, id ASC`);
    const provinces = provinceRaws.filter(p => p.offlineProvince_offlineCity_ID === Number(city));
    const { stores, pn } = await getStores(req, res, align, filter, { city, province }, keyword);
    res.render('layout', {
      pageTitle: `스토어 - ${res.locals.setting.siteName}`,
      type: 'location',
      stores,
      location,
      align,
      cities,
      provinces,
      page,
      pn,
    });
  } finally {
    conn.release();
  }
});

const getStores = doAsync(async (req, res, align, filter, location, keyword, limit) => {
  const conn = await pool.getConnection();
  try {
    let query = null;
    let filterQuery = '';
    let locationQuery = '';
    let keywordQuery = '';
    const city = location?.city || null;
    const province = location?.province || null;
    if (filter) {
      filterQuery = `AND t.slug = '${filter}'`;
      if (city && province) {
        locationQuery = `
        AND s.offlineStore_offlineCity_ID = ${city}
        AND s.offlineStore_offlineProvince_ID = ${province}`;
      } else if (city) {
        locationQuery = `AND s.offlineStore_offlineCity_ID = ${city}`;
      }
      if (keyword) keywordQuery = `AND s.title LIKE CONCAT('%','${keyword}','%')`;
    } else {
      if (city && province) {
        locationQuery = `
        AND s.offlineStore_offlineCity_ID = ${city}
        AND s.offlineStore_offlineProvince_ID = ${province}`;
        if (keyword) keywordQuery = `AND s.title LIKE CONCAT('%','${keyword}','%')`;
      } else if (city) {
        locationQuery = `
        AND s.offlineStore_offlineCity_ID = ${city}`;
        if (keyword) keywordQuery = `AND s.title LIKE CONCAT('%','${keyword}','%')`;
      } else {
        if (keyword) keywordQuery = `AND s.title LIKE CONCAT('%','${keyword}','%')`;
      }
    }
    let stores = [];
    const pnQuery = `SELECT count(DISTINCT s.id) AS count
    FROM offlineStore AS s
    LEFT JOIN offlineStoreOfflineType AS st
    ON s.id = st.offlineStoreOfflineType_offlineStore_ID
    LEFT JOIN offlineType AS t
    ON st.offlineStoreOfflineType_offlineType_ID = t.id
    WHERE s.status = 1
    ${filterQuery}
    ${locationQuery}
    ${keywordQuery}`;
    const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
    if (align === 'distance' || align === undefined) {
      // Geo
      const geoLocation = req.cookies['geoLocation'];
      if (geoLocation) {
        query = `SELECT s.*,
        (6371*acos(cos(radians(?))*cos(radians(s.geometryLatitude))*cos(radians(s.geometryLongitude)
        -radians(?))+sin(radians(?))*sin(radians(s.geometryLatitude)))) AS distance
        FROM offlineStore AS s
        LEFT JOIN offlineStoreOfflineType AS st
        ON s.id = st.offlineStoreOfflineType_offlineStore_ID
        LEFT JOIN offlineType AS t
        ON st.offlineStoreOfflineType_offlineType_ID = t.id
        WHERE s.status = 1
        ${filterQuery}
        ${locationQuery}
        ${keywordQuery}
        GROUP BY s.id
        ORDER BY distance IS NULL ASC, distance ASC
        ${pn.queryLimit}`;
        [stores, ] = await conn.query(query, [geoLocation.latitude, geoLocation.longitude, geoLocation.latitude]);
      } else {
        query = `SELECT s.*
        FROM offlineStore AS s
        LEFT JOIN offlineStoreOfflineType AS st
        ON s.id = st.offlineStoreOfflineType_offlineStore_ID
        LEFT JOIN offlineType AS t
        ON st.offlineStoreOfflineType_offlineType_ID = t.id
        WHERE s.status = 1
        ${filterQuery}
        ${locationQuery}
        ${keywordQuery}
        GROUP BY s.id
        ORDER BY s.createdAt DESC
        ${pn.queryLimit}`;
        [stores, ] = await conn.query(query);
      }
    } else if (align === 'update') {
      query = `SELECT s.*
      FROM offlineStore AS s
      LEFT JOIN offlineStoreOfflineType AS st
      ON s.id = st.offlineStoreOfflineType_offlineStore_ID
      LEFT JOIN offlineType AS t
      ON st.offlineStoreOfflineType_offlineType_ID = t.id
      WHERE s.status = 1
      ${filterQuery}
      ${locationQuery}
      ${keywordQuery}
      GROUP BY s.id
      ORDER BY s.updatedAt DESC
      ${pn.queryLimit}`;
      [stores, ] = await conn.query(query);
    } else if (align === 'view') {
      query = `SELECT s.*
      FROM offlineStore AS s
      LEFT JOIN offlineStoreOfflineType AS st
      ON s.id = st.offlineStoreOfflineType_offlineStore_ID
      LEFT JOIN offlineType AS t
      ON st.offlineStoreOfflineType_offlineType_ID = t.id
      WHERE s.status = 1
      ${filterQuery}
      ${locationQuery}
      ${keywordQuery}
      GROUP BY s.id
      ORDER BY s.viewCount DESC
      ${pn.queryLimit}`;
      [stores, ] = await conn.query(query);
    } else if (align === 'review') {
      query = `SELECT s.*
      FROM offlineStore AS s
      LEFT JOIN offlineStoreOfflineType AS st
      ON s.id = st.offlineStoreOfflineType_offlineStore_ID
      LEFT JOIN offlineType AS t
      ON st.offlineStoreOfflineType_offlineType_ID = t.id
      WHERE s.status = 1
      ${filterQuery}
      ${locationQuery}
      ${keywordQuery}
      GROUP BY s.id
      ORDER BY s.reviewCount DESC
      ${pn.queryLimit}`;
      [stores, ] = await conn.query(query);
    } else if (align === 'grade') {
      query = `SELECT s.*
      FROM offlineStore AS s
      LEFT JOIN offlineStoreOfflineType AS st
      ON s.id = st.offlineStoreOfflineType_offlineStore_ID
      LEFT JOIN offlineType AS t
      ON st.offlineStoreOfflineType_offlineType_ID = t.id
      WHERE s.status = 1
      ${filterQuery}
      ${locationQuery}
      ${keywordQuery}
      GROUP BY s.id
      ORDER BY s.grade DESC
      ${pn.queryLimit}`;
      [stores, ] = await conn.query(query);
    } else {
      query = `SELECT s.*
      FROM offlineStore AS s
      LEFT JOIN offlineStoreOfflineType AS st
      ON s.id = st.offlineStoreOfflineType_offlineStore_ID
      LEFT JOIN offlineType AS t
      ON st.offlineStoreOfflineType_offlineType_ID = t.id
      WHERE s.status = 1
      GROUP BY s.id
      ORDER BY s.grade DESC
      LIMIT ${limit}`;
      [stores, ] = await conn.query(query);
    }
    for await (let store of stores) {
      const [images, ] = await conn.query(`SELECT * FROM offlineImage WHERE offlineImage_offlineStore_ID=? ORDER BY viewOrder ASC, id ASC LIMIT 1`, [store.id]);
      if (images.length) {
        const image = images[0];
        store.image = image;
      }
      const [products, ] = await conn.query(`SELECT * FROM offlineProduct WHERE offlineProduct_offlineStore_ID=? ORDER BY viewOrder ASC, id ASC LIMIT 1`, [store.id]);
      if (products.length) {
        const product = products[0];
        store.product = product;
      }
      // Like
      if (res.locals.user) {
        const user = res.locals.user;
        const [likeResult, ] = await conn.query(`SELECT * FROM offlineUserLikeStore WHERE offlineUserLikeStore_user_ID=? AND offlineUserLikeStore_store_ID=?`, [user.id, store.id]);
        likeResult.length ? store.like = true : store.like = false;
      }
      // Distance
      if (store.distance) {
        store.distance = `${Math.round(store.distance)}km`;
      }
    }

    for await (let store of stores) {
      const [images, ] = await conn.query(`SELECT * FROM offlineImage WHERE offlineImage_offlineStore_ID=? ORDER BY viewOrder ASC, id ASC LIMIT 1`, [store.id]);
      if (images.length) {
        const image = images[0];
        store.image = image;
      }
      const [products, ] = await conn.query(`SELECT * FROM offlineProduct WHERE offlineProduct_offlineStore_ID=? ORDER BY viewOrder ASC, id ASC LIMIT 1`, [store.id]);
      if (products.length) {
        const product = products[0];
        store.product = product;
      }
    }
    return {
      stores,
      pn,
    };
  } finally {
    conn.release();
  }
});

exports.store = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { storeId } = req.params;
    const query = `SELECT s.*, p.title AS province
    FROM offlineStore AS s
    LEFT JOIN offlineProvince AS p
    ON s.offlineStore_offlineProvince_ID = p.id
    WHERE s.id=?`;
    const [stores, ] = await conn.query(query, [storeId]);
    if (stores.length) {
      const store = stores[0];
      // Products
      const [products, ] = await conn.query(`SELECT * FROM offlineProduct WHERE offlineProduct_offlineStore_ID=? ORDER BY viewOrder ASC, id ASC`, [storeId]);
      store.products = products;
      // Types
      const typeQuery = `SELECT st.*, t.title AS title, t.slug AS slug
      FROM offlineStoreOfflineType AS st
      LEFT JOIN offlineType AS t
      ON st.offlineStoreOfflineType_offlineType_ID = t.id
      WHERE st.offlineStoreOfflineType_offlineStore_ID = ?
      `;
      const [types, ] = await conn.query(typeQuery, [storeId]);
      store.types = types;
      // Like
      if (res.locals.user) {
        const user = res.locals.user;
        const [likeResult, ] = await conn.query(`SELECT * FROM offlineUserLikeStore WHERE offlineUserLikeStore_user_ID=? AND offlineUserLikeStore_store_ID=?`, [user.id, storeId]);
        likeResult.length ? store.like = true : store.like = false;
      }
      // Reviews
      const pnQuery = `SELECT count(*) AS count FROM offlineReview WHERE offlineReview_offlineStore_ID=${storeId}`;
      const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
      const reviewQuery = `SELECT r.*, u.nickName AS nickName
      FROM offlineReview AS r
      LEFT JOIN user AS u
      ON r.offlineReview_user_ID = u.id
      WHERE r.offlineReview_offlineStore_ID=?
      ORDER BY r.id DESC
      ${pn.queryLimit}`;
      const [reviews, ] = await conn.query(reviewQuery, [storeId]);
      reviews.forEach(r => {
        r.datetime = datetime(r.createdAt);
        r.content = r.content.replaceAll('\r\n', '<br>');
      });
      store.reviews = reviews;
      // Images
      const [images, ] = await conn.query(`SELECT * FROM offlineImage WHERE offlineImage_offlineStore_ID=? ORDER BY viewOrder ASC, id ASC`, [storeId]);
      store.images = images;
      store.phone = store.phone?.replace(/([0-9]{3})([0-9]{4})([0-9]{4})/, '$1-$2-$3');

      // 조회수 증가
      if (req.cookies[storeId] === undefined) {
        res.cookie(storeId, req.ip, {
          maxAge: 600000,
        });
        await conn.query(`UPDATE offlineStore SET viewCount=viewCount+1 WHERE id=?`, [storeId]);
      }

      res.render('layout', {
        pageTitle: `스토어 - ${res.locals.setting.siteName}`,
        type: 'store',
        store,
        pn,
      });
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.storeLike = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { storeId } = req.params;
    const user = res.locals.user;
    const query = `SELECT *
    FROM offlineUserLikeStore
    WHERE offlineUserLikeStore_user_ID=?
    AND offlineUserLikeStore_store_ID=?`;
    const [result, ] = await conn.query(query, [user.id, storeId]);
    if (!result.length) {
      await conn.query(`INSERT INTO offlineUserLikeStore (offlineUserLikeStore_user_ID, offlineUserLikeStore_store_ID) VALUES (?, ?)`, [user.id, storeId]);
    } else {
      await conn.query(`DELETE FROM offlineUserLikeStore WHERE offlineUserLikeStore_user_ID=? AND offlineUserLikeStore_store_ID=?`, [user.id, storeId]);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.storeReviewNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { storeId } = req.params;
    const { content, grade } = req.body;
    const user = res.locals.user;
    const query = `INSERT INTO offlineReview
    (offlineReview_user_ID, offlineReview_offlineStore_ID, content, grade)
    VALUES (?, ?, ?, ?)`;
    await conn.query(query, [user.id, storeId, content, grade]);
    // Update Grade
    const [reviews, ] = await conn.query(`SELECT * FROM offlineReview WHERE offlineReview_offlineStore_ID=?`, [storeId]);
    let total = 0;
    reviews.forEach(r => {
      total += r.grade;
    });
    const totalGrade = total / reviews.length;
    await conn.query(`UPDATE offlineStore SET grade=?, reviewCount=reviewCount+1, updatedAt=NOW() WHERE id=?`, [totalGrade, storeId]);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.storeReviewEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { storeId, reviewId } = req.params;
    const { submit } = req.body;
    const user = res.locals.user;
    if (submit === 'edit') {

    } else if (submit === 'delete') {
      const [reviewResult, ] = await conn.query(`SELECT * FROM offlineReview WHERE offlineReview_offlineStore_ID=? AND id=?`, [storeId, reviewId]);
      if (reviewResult.length) {
        const review = reviewResult[0];
        // 검증
        if (review.offlineReview_user_ID === user.id) {
          await conn.query(`DELETE FROM offlineReview WHERE id=?`, [reviewId]);
          const [reviews, ] = await conn.query(`SELECT * FROM offlineReview WHERE offlineReview_offlineStore_ID=?`, [storeId]);
          let total = 0;
          reviews.forEach(r => {
            total += r.grade;
          });
          const totalGrade = total / reviews.length;
          await conn.query(`UPDATE offlineStore SET grade=?, reviewCount=reviewCount-1 WHERE id=?`, [totalGrade, storeId])
        } else {
          next();
        }
      } else {
        next();
      }
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});