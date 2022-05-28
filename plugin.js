const colors = require('colors');
const mysql = require('mysql2/promise');
const sql = require('./config.json').sql.production;

const pool = mysql.createPool({
  host: sql.host,
  user: sql.user,
  password: sql.password,
  port: sql.port,
});

const DATABASE_NAME = sql.database || 'cms';

const PLUGIN = process.argv[2] || null;

const main = async () => {
  try {
    await start();
    if (PLUGIN === 'seo') {
      await pluginSeoOrder();
      await pluginSeoOrderService();
      await pluginSeoService();
    }
    await end();
  } catch (e) {
    console.error(e);
  }
};

const start = async () => {
  try {
    const conn = await pool.getConnection();
    try {
      const [result, ] = await conn.query(`SHOW DATABASES LIKE '${DATABASE_NAME}'`);
      if (result.length === 0) {
        await conn.query(`CREATE DATABASE ${DATABASE_NAME};`);
      }
      await conn.query(`USE ${DATABASE_NAME};`);
      await conn.query(`set FOREIGN_KEY_CHECKS = 0;`);
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
  }
};

const pluginSeoOrder = async () => {
  try {
    const conn = await pool.getConnection();
    try {
      const query = `CREATE TABLE pluginSeoOrder (
        id int unsigned NOT NULL AUTO_INCREMENT,
        pluginSeoOrder_user_ID int unsigned DEFAULT NULL,
        hash varchar(200) NOT NULL,
        message longtext,
        url varchar(400) DEFAULT NULL,
        keyword varchar(400) DEFAULT NULL,
        status tinyint(1) DEFAULT '1',
        updatedAt datetime DEFAULT CURRENT_TIMESTAMP,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY hash (hash),
        KEY pluginSeoOrder_user_ID (pluginSeoOrder_user_ID),
        CONSTRAINT pluginSeoOrder_user_ID FOREIGN KEY (pluginSeoOrder_user_ID) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;
      const [rows, ] = await conn.query(query);
      if (rows) {
        console.log(`'pluginSeoOrder' 테이블 생성완료`.green);
      }
    } finally {
      conn.release();
    }
  } catch (e) {
    if (e.errno === 1050) {
      console.log(`이미 'pluginSeoOrder' 테이블이 있습니다.`.red);
    } else {
      console.error(e);
    }
  }
};

const pluginSeoOrderService = async () => {
  try {
    const conn = await pool.getConnection();
    try {
      const query = `CREATE TABLE pluginSeoOrderService (
        id int unsigned NOT NULL AUTO_INCREMENT,
        pluginSeoOrderService_pluginSeoOrder_ID int unsigned DEFAULT NULL,
        pluginSeoOrderService_pluginSeoService_ID int unsigned DEFAULT NULL,
        count int unsigned DEFAULT NULL,
        updatedAt datetime DEFAULT CURRENT_TIMESTAMP,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY pluginSeoOrderService_pluginSeoOrder_ID (pluginSeoOrderService_pluginSeoOrder_ID),
        KEY pluginSeoOrderService_pluginSeoService_ID (pluginSeoOrderService_pluginSeoService_ID),
        CONSTRAINT pluginSeoOrderService_pluginSeoOrder_ID FOREIGN KEY (pluginSeoOrderService_pluginSeoOrder_ID) REFERENCES pluginSeoOrder (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT pluginSeoOrderService_pluginSeoService_ID FOREIGN KEY (pluginSeoOrderService_pluginSeoService_ID) REFERENCES pluginSeoService (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;
      const [rows, ] = await conn.query(query);
      if (rows) {
        console.log(`'pluginSeoOrderService' 테이블 생성완료`.green);
      }
    } finally {
      conn.release();
    }
  } catch (e) {
    if (e.errno === 1050) {
      console.log(`이미 'pluginSeoOrderService' 테이블이 있습니다.`.red);
    } else {
      console.error(e);
    }
  }
};

const pluginSeoService = async () => {
  try {
    const conn = await pool.getConnection();
    try {
      const query = `CREATE TABLE pluginSeoService (
        id int unsigned NOT NULL AUTO_INCREMENT,
        type varchar(45) NOT NULL,
        title varchar(200) DEFAULT NULL,
        summary varchar(400) DEFAULT NULL,
        content longtext,
        point int unsigned DEFAULT '0',
        minCount int DEFAULT '1',
        viewOrder int unsigned DEFAULT '100',
        best tinyint(1) DEFAULT '0',
        status tinyint(1) DEFAULT '0',
        updatedAt datetime DEFAULT CURRENT_TIMESTAMP,
        createdAt datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY type (type)
      ) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;
      const [rows, ] = await conn.query(query);
      if (rows) {
        console.log(`'pluginSeoService' 테이블 생성완료`.green);
      }
    } finally {
      conn.release();
    }
  } catch (e) {
    if (e.errno === 1050) {
      console.log(`이미 'pluginSeoService' 테이블이 있습니다.`.red);
    } else {
      console.error(e);
    }
  }
};

const end = async () => {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.query(`set FOREIGN_KEY_CHECKS = 1;`);
      console.log('Install Complete');
      process.exit(1);
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
  }
};

main();