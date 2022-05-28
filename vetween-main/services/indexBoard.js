const { timezone } = require('../config');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault(timezone);
const datetime = require('../middleware/datetime');
const isNew = require('../middleware/isNew');
const match = require('../middleware/match');
const Article = require('../services/article');

const Class = require('./class');

class IndexBoard extends Class {
  async get (position) {
    let positionString = '';
    if (position === 'index') {
      positionString = `WHERE type != 'side'`;
    } else if (position === 'side') {
      positionString = `WHERE type = 'side'`;
    }
    const query = `SELECT *
    FROM indexBoardGroup
    ${positionString}
    ORDER BY viewOrder ASC, id ASC`;
    const [indexBoardGroups, ] = await this.conn.query(query);
    indexBoardGroups.forEach(indexBoardGroup => {
      indexBoardGroup.content = indexBoardGroup.content?.replace('\r\n', '<br>');
    });
    for await (let indexBoardGroup of indexBoardGroups) {
      const indexBoardQuery = `SELECT ib.*, b.title, b.slug
      FROM indexBoard AS ib
      LEFT JOIN indexBoardIndexBoardGroup AS ibig
      ON ib.id = ibig.indexBoardIndexBoardGroup_indexBoard_ID
      LEFT JOIN board AS b
      ON ib.indexBoard_board_ID = b.id
      WHERE ibig.indexBoardIndexBoardGroup_indexBoardGroup_ID=?
      ORDER BY ib.viewOrder ASC, ib.id ASC`;
      const [indexBoards, ] = await this.conn.query(indexBoardQuery, [indexBoardGroup.id]);
      for await (let indexBoard of indexBoards) {
        let articles = [];
        let articleBoardQuery = '';
        if (indexBoard.indexBoard_board_ID === 0) {
          articleBoardQuery += `WHERE a.status = 2 AND a.status != ?`;
          if (indexBoard.articleOrder === 'best') {
            indexBoard.title = `인기게시글`;
            // indexBoard.slug = `best`;
          } else {
            indexBoard.title = `전체게시글`;
            // indexBoard.slug = `all`;
          }
        } else {
          articleBoardQuery += `WHERE a.article_board_ID=? AND a.status = 2`;
        }
        if (indexBoard.articleOrder === 'best' && indexBoard.indexBoard_board_ID !== 0) {
          articles = await this.returnBestArticles(indexBoard, articleBoardQuery);
          indexBoard.title = `${indexBoard.title} 인기게시글`;
        } else {
          let articleOrderQuery = '';
          if (indexBoard.articleOrder === 'lately') {
            articleOrderQuery = `ORDER BY a.createdAt DESC`;
          } else if (indexBoard.articleOrder === 'older') {
            articleOrderQuery = `ORDER BY a.createdAt ASC`;
          } else if (indexBoard.articleOrder === 'random') {
            articleOrderQuery = `ORDER BY RAND()`;
          }
          const articlesQuery = `SELECT a.*, b.slug AS boardSlug, c.title AS category
          FROM article AS a
          LEFT JOIN board AS b
          ON a.article_board_ID = b.id
          LEFT JOIN category AS c
          ON a.article_category_ID = c.id
          ${articleBoardQuery}
          ${articleOrderQuery}
          LIMIT ?`;
          [articles, ] = await this.conn.query(articlesQuery, [indexBoard.indexBoard_board_ID, indexBoard.viewCount]);
        }
        const articleClass = new Article(this.req, this.res, this.conn);
        for await (let article of articles) {
          const [images, ] = await this.conn.query(`SELECT * FROM image WHERE image_article_ID=?`, [article.id]);
          article.images = images;
          article = articleClass.setInfo(article);

          if (indexBoardGroup.type === 'blog') {
            article.content = article.content.replace(match.tag, '');
          }
        }
        indexBoard.articles = articles;
      }
      indexBoardGroup.indexBoards = indexBoards;
    }
    return indexBoardGroups;
  }
  async returnBestArticles (indexBoard, articleBoardQuery) {
    let articles = [];
    const [weekArticles, ] = await this.conn.query(this.returnBestQuery('week', articleBoardQuery), [indexBoard.indexBoard_board_ID, indexBoard.viewCount - articles.length]);
    weekArticles.forEach(article => {
      articles.push(article);
    });
    if (articles.length < indexBoard.viewCount) {
      const [monthArticles, ] = await this.conn.query(this.returnBestQuery('month', articleBoardQuery), [indexBoard.indexBoard_board_ID, indexBoard.viewCount - articles.length]);
      monthArticles.forEach(article => {
        articles.push(article);
      });
    }
    if (articles.length < indexBoard.viewCount) {
      const [allArticles, ] = await this.conn.query(this.returnBestQuery(null, articleBoardQuery), [indexBoard.indexBoard_board_ID, indexBoard.viewCount - articles.length]);
      allArticles.forEach(article => {
        articles.push(article);
      });
    }
    return articles;
  }
  returnBestQuery (date, articleBoardQuery) {
    let queryString = '';
    if (date === 'week') {
      queryString += `AND a.createdAt >= date_format(date_add(NOW(), INTERVAL -7 DAY), '%Y-%m-%d')`;
    } else if (date === 'month') {
      queryString += `AND a.createdAt >= date_format(date_add(NOW(), INTERVAL -1 MONTH), '%Y-%m-%d')`;
    }
    const query = `SELECT a.*, b.slug AS boardSlug, c.title AS category
    FROM article AS a
    LEFT JOIN board AS b
    ON a.article_board_ID = b.id
    LEFT JOIN category AS c
    ON a.article_category_ID = c.id
    ${articleBoardQuery}
    ${queryString}
    ORDER BY (a.viewCount * 0.3) + (a.likeCount * 0.7) DESC
    LIMIT ?`;
    return query;
  }
}

module.exports = IndexBoard;