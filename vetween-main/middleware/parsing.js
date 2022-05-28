const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const AWS = require('aws-sdk');
const delay = require('./delay');
const pool = require('./database');
const config = require('./config');

const s3 = config.getS3();

const { accessKeyId, secretAccessKey, region, bucket, host, endpoint } = s3;

const s3Article = new AWS.S3({
  accessKeyId,
  secretAccessKey,
});

const s3Thumb = new AWS.S3({
  accessKeyId,
  secretAccessKey,
});

const uploadFile = (file) => {
  return new Promise((resolve, reject) => {
    if (file) {
      const key = file.name;
      const articleParams = {
        Bucket: bucket,
        Key: `article/${key}`,
        Body: file.data,
      };
      const thumbParams = {
        Bucket: bucket,
        Key: `thumb/${key}`,
        Body: file.data,
      };
      s3Article.upload(articleParams, (err, data) => {
        if (err) {
          console.error(err);
          reject(null);
        } else {
          resolve(key);
        }
      });
      s3Thumb.upload(thumbParams, (err, data) => {
        if (err) {
          console.error(err);
          reject(null);
        } else {
          resolve(key);
        }
      });
    } else {
      console.error('파일이 없습니다.');
    }
  });
};

const USER_AGENT = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15`;

class Parsing {
  constructor (user, site, board, startPage, lastPage) {
    this.user = user;
    this.site = site;
    this.board = board;
    this.startPage = Number(startPage);
    this.lastPage = Number(lastPage);
    this.articleUrls = [];
    this.articles = [];
  }
  async start () {
    console.log('Start Parsing');
    // 아티클 가져오기
    for (let i = this.startPage; i <= this.lastPage; i ++) {
      const url = this.getUrl(i);
      const data = await this.getSource(url);
      const result = this.getArticles(data);
      console.log(`목록 가져오기 : ${result}`);
      await delay(this.site.delay);
    }
    for await (let articleUrl of this.articleUrls) {
      let result = null;
      const conn = await pool.getConnection();
      try {
        const searchQuery = `SELECT *
        FROM parsingArticle
        WHERE parsingArticle_parsingSite_ID = ?
        AND parsingArticle_parsingBoard_ID = ?
        AND articleId = ?`;
        const articleId = this.getArticleId(articleUrl);
        [result, ] = await conn.query(searchQuery, [this.site.id, this.board.id, articleId]);
      } finally {
        conn.release();
      }
      if (!result.length) {
        await this.addArticle(articleUrl);
        await delay(this.site.delay);
      }
    }
    console.log(`게시물 갯수 : ${this.articles.length}`);
    this.uploadArticles();
  }
  async getSource (url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    return response.data;
  }
  getArticles (data) {
    const $ = cheerio.load(data);
    let listSelector = null;
    if (this.board.listSelector) {
      const select = this.board.listSelector.match(/'([A-z0-9._\s]+)'/)[1];
      let parent = null;
      if (this.board.listSelector.match(/.parent\(\)/)) parent = this.board.listSelector.match(/.parent\(\)/)[0];
      if (parent) {
        listSelector = $(`${select}`).parent();
      } else {
        listSelector = $(`${select}`);
      }
    }
    const articleUrls = listSelector || $(`${this.site.listSelector}`);
    for (let articleUrl of articleUrls) {
      this.articleUrls.push(articleUrl.attribs.href.replace('../', `${this.site.url}/`));
    }
    return true;
  }
  getUrl (page) {
    const url = this.site.urlStructure
      .replace('[domain]', this.site.url)
      .replace('[board]', this.board.slug)
      .replace('[page]', page);
    return url;
  }
  async addArticle (url) {
    const conn = await pool.getConnection();
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        responseType: 'arraybuffer',
      });
      const html = iconv.decode(response.data, 'EUC-KR');
      const $ = cheerio.load(html);
      let titleSelector = null;
      if (this.board.titleSelector) {
        titleSelector = $(`${this.board.titleSelector}`).text();
      } else {
        titleSelector = $(`${this.site.titleSelector}`).text();
      }
      const titleRaw = titleSelector || this.site.titleSelector;
      const title = titleRaw
        .replace(/\[[a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣\s]+\]/ig, '')
        .trim();
      const contentRaw = $(`${this.site.contentSelector}`).html();
      const content = contentRaw.trim();
      const articleId = this.getArticleId(url);
  
      // 중복 체크
      const searchQuery = `SELECT *
      FROM parsingArticle
      WHERE parsingArticle_parsingSite_ID = ?
      AND parsingArticle_parsingBoard_ID = ?
      AND articleId = ?`;
      const [result, ] = await conn.query(searchQuery, [this.site.id, this.board.id, articleId]);
      if (!result.length) {
        this.articles.push({
          articleId,
          title,
          content,
          url,
        });
        const insertQuery = `INSERT INTO parsingArticle
        (parsingArticle_parsingSite_ID, parsingArticle_parsingBoard_ID, articleId, title, content, url)
        VALUES (?, ?, ?, ?, ?, ?)`;
        await conn.query(insertQuery, [this.site.id, this.board.id, articleId, title, content, url]);
      }
    } finally {
      conn.release();
    }
  }
  getArticleId (url) {
    const articleIdRegex = new RegExp(`${this.site.articleIdRegex}([0-9]+)`);
    const articleId = url.match(articleIdRegex)[1];
    return articleId;
  }
  async uploadArticles () {
    const conn = await pool.getConnection();
    try {
      const query = `SELECT *
      FROM parsingArticle
      WHERE parsingArticle_parsingSite_ID = ?
      AND parsingArticle_parsingBoard_ID = ?
      AND submit = 0
      ORDER BY id ASC`;
      const [articles, ] = await conn.query(query, [this.site.id, this.board.id]);
      for await (let article of articles) {
        // conn.beginTransaction();
        // Insert
        const insertQuery = `INSERT INTO article
        (article_board_ID, article_user_ID, title, content)
        VALUES (?, ?, ?, ?)`;
        const { title, content } = article;
        const [insertResult, ] = await conn.query(insertQuery, [this.board.parsingBoard_targetBoard_ID, this.user.id, title, content]);
        const insertId = insertResult.insertId;
        // Images
        const imageRegex = /<img\s+[^>]*src="([^"]*)"[^>]*>/ig;
        const imageRaws = Array.from(article.content.matchAll(imageRegex)).map(match => match);
        const videoRegex = /<video\s[\w\W]+src="([\w\W]+)"[\w\W^"]+type="[\w\W]+"[\w\W]+<\/video>/ig;
        const videoRaws = Array.from(article.content.matchAll(videoRegex)).map(match => match);
        let images = [];
        for await (let imageRaw of imageRaws) {
          let originTag = imageRaw[0];
          let imageUrl = imageRaw[1].replace('../', `${this.site.url}/`);
          if (!imageUrl.match('http')) {
            imageUrl = `${this.site.url}${imageUrl}`;
          }
          const data = await this.downloadImage(imageUrl);
          if (data) {
            const key = await this.uploadImage(data);
            const s3Url = `${host}/article/${key}`;
            images.push(imageUrl);
            originTag = originTag
              .replace('[', '\\[')
              .replace(']', '\\]')
              .replace('(', '\\(')
              .replace(')', '\\)')
            const regex = new RegExp(originTag);
            await conn.query(`INSERT INTO image (image_article_ID, image) VALUES (?, ?)`, [insertId, key]);
            article.content = article.content.replace(regex, `<img src="${s3Url}">`);
          }
        }
        for await (let videoRaw of videoRaws) {
          let originTag = videoRaw[0];
          let videoUrl = videoRaw[1].replace('../', `${this.site.url}/`);
          if (!videoUrl.match('http')) {
            videoUrl = `${this.site.url}${videoUrl}`;
          }
          const data = await this.downloadImage(videoUrl);
          const key = await this.uploadImage(data);
          const s3Url = `${host}/article/${key}`;
          images.push(videoUrl);
          originTag = originTag
            .replace('[', '\\[')
            .replace(']', '\\]')
            .replace('(', '\\(')
            .replace(')', '\\)')
          const regex = new RegExp(originTag);
          await conn.query(`INSERT INTO image (image_article_ID, image) VALUES (?, ?)`, [insertId, key]);
          article.content = article.content.replace(regex, `<video autoplay><source src="${s3Url}"></video>`);
        }
        await conn.query(`UPDATE article SET content=? WHERE id=?`, [article.content, insertId]);
        await conn.query(`UPDATE parsingArticle SET submit=? WHERE id=?`, [1, article.id]);
        article.images = images;
        // await conn.commit();
      }
    } catch (e) {
      await conn.rollback();
      next(e);
    } finally {
      conn.release();
    }
  }
  async downloadImage (url) {
    // Filename
    // const regex = /[^/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/ig;
    const originalname = url;
    let extension = path.extname(originalname);
    if (path.extname(originalname) === '.jpeg') extension = '.jpg';
    const str = Math.random().toString(36).substr(2,11);
    const name = `${Date.now().toString()}-${str}${extension.toLowerCase()}`;
    // Data
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
      responseType: 'arraybuffer',
    });
    return {
      name,
      data: response.data,
    };
  }
  async uploadImage (file) {
    const key = await uploadFile(file);
    return key;
  }
}

module.exports = Parsing;