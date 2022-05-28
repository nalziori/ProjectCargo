const colors = require('colors');
const pool = require('./middleware/database');
const sql = require('./config.json').sql.production;
const updates = require('./update.json');

const argv = process.argv[2] || null;

const main = async () => {
  try {
    const conn = await pool.getConnection();
    try {
      if (argv === null) {
        for await (let update of updates) {
          const [result, ] = await conn.query(`SELECT * FROM \`update\` WHERE hash=?`, [update.hash]);
          if (!result.length) {
            await conn.query(`INSERT INTO \`update\` (\`hash\`, \`sql\`) VALUES (?, ?)`, [update.hash, update.sql]);
          }
        }
        // 쿼리 실행
        const [execs, ] = await conn.query(`SELECT * FROM \`update\` WHERE status=1 ORDER BY id ASC`);
        for await (let exec of execs) {
          let query = exec.sql;
          if (sql.database !== 'cms') query = exec.sql.replaceAll(`\`cms\``, `\`${sql.database}\``);
          try {
            await conn.query(query);
            await conn.query(`UPDATE \`update\` SET status=0 WHERE id=?`, [exec.id]);
            console.log('업데이트 완료'.green);
          } catch (e) {
            await conn.query(`UPDATE \`update\` SET status=0 WHERE id=?`, [exec.id]);
            console.log('이미 업데이트됨'.red);
          }
        }
      }
      if (argv === 'force') {
        for await (let update of updates) {
          const query = update.sql.replaceAll(`\`cms\``, `\`${sql.database}\``);
          try {
            await conn.query(query);
            console.log('업데이트 완료'.green);
          } catch (e) {
            console.log('이미 업데이트됨'.red);
          }
        }
      }
      if (argv === 'article') {
        await conn.query(`UPDATE article SET status=? WHERE status=1`, [2]);
      }
      if (argv === 'layout') {
        const [settings, ] = await conn.query(`SELECT * FROM setting ORDER BY id DESC LIMIT 1`);
        if (settings.length) {
          const setting = settings[0];
          await conn.query(`UPDATE setting SET mainLayout=? WHERE id=?`, ['basic', setting.id])
        }
      }
      if (argv === 'assets') {
        await conn.query(`UPDATE assets SET type=? WHERE image != NULL`, ['image']);
      }
      if (argv === 'tag') {
        const Tag = require('./services/tag');
        const [articles, ] = await conn.query(`SELECT * FROM article`);
        const tagClass = new Tag(null, null, conn);
        for await (let article of articles) {
          await tagClass.set(article.id, article.tags);
          console.log(`article id: ${article.id} complete`);
        }
      }
    } finally {
      conn.release();
      console.log('Update Complete');
      process.exit(1);
    }
  } catch (e) {
    console.error(e);
  }
};

main();