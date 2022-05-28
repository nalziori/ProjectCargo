const bcrypt = require('bcrypt');
const Class = require('./class');
const User = require('./user');
const Board = require('./board');
const Article = require('./article');
const Point = require('./point');
const Alarm = require('./alarm');
const datetime = require('../middleware/datetime');
const config = require('../middleware/config');

const SALT_COUNT = 10;

const s3 = config.getS3();

class Comment extends Class {
  async get (commentId) {
    const query = `SELECT c.*, u.uId, u.nickName
    FROM comment AS c
    LEFT JOIN user AS u
    ON c.comment_user_ID = u.id
    WHERE c.id=?`;
    const [comments, ] = await this.conn.query(query, [commentId]);
    if (comments.length) {
      const comment = comments[0];
      return comment;
    } else {
      return null;
    }
  }
  async create (articleId, data) {
    data = Object.assign({
      content: null,
      nickName: null,
      password: null,
    }, data);
    const { nickName, password } = data;
    let { content } = data;

    const boardClass = new Board(this.req, this.res, this.conn);
    const articleClass = new Article(this.req, this.res, this.conn);
    const article = await articleClass.get(articleId);
    const board = await boardClass.getById(article.article_board_ID);

    const tagRegex = new RegExp(/<[^>]*>/g);
    content = content.replace(tagRegex, '');

    // 비회원
    let hash = null;
    if (nickName && password) {
      const salt = bcrypt.genSaltSync(SALT_COUNT);
      hash = bcrypt.hashSync(password, salt);
    }

    // this.conn.beginTransaction();
    const query = `INSERT INTO comment
    (comment_user_ID, comment_article_ID, content, nickName, password)
    VALUES (?, ?, ?, ?, ?)`;

    const [result, ] = await this.conn.query(query, [this.user?.id, articleId, content, nickName, hash]);
    if (result.insertId) {
      await this.conn.query(`UPDATE comment SET comment_group_ID=? WHERE id=?`, [result.insertId, result.insertId]);
      await this.conn.query(`UPDATE article SET commentCount=commentCount+1, updatedAt=NOW() WHERE id=?`, [articleId]);
      // 포인트
      if (this.user) {
        const pointClass = new Point(this.req, this.res, this.conn);
        const pointData = {
          user: this.user,
          type: 'createComment',
          point: board.commentPoint,
        };
        await pointClass.create(pointData);
      }
      // await this.conn.commit();
      // 알람
      const alarmClass = new Alarm(this.req, this.res, this.conn);
      const alarmData = {
        type: 'newComment',
        userId: article.article_user_ID,
        relatedUserId: this.user?.id,
        boardId: board.id,
        articleId: article.id,
      };
      await alarmClass.create(alarmData);
      return true;
    } else {
      // await this.conn.commit();
      return false;
    }
  }
  async reply (commentId, data) {
    data = Object.assign({
      content: null,
      nickName: null,
      password: null,
    }, data);
    let { content, nickName, password } = data;
    const comment = await this.get(commentId);

    const boardClass = new Board(this.req, this.res, this.conn);
    const articleClass = new Article(this.req, this.res, this.conn);
    const article = await articleClass.get(comment.comment_article_ID);
    const board = await boardClass.getById(article.article_board_ID);

    const tagRegex = new RegExp(/<[^>]*>/g);
    content = content.replace(tagRegex, '');

    // 비회원
    let hash = null;
    if (nickName && password) {
      const salt = bcrypt.genSaltSync(SALT_COUNT);
      hash = bcrypt.hashSync(password, salt);
    }

    // this.conn.beginTransaction();
    const insertQuery = `INSERT INTO comment
    (comment_user_ID, comment_article_ID, comment_parent_ID, comment_group_ID, content, nickName, password)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const [result, ] = await this.conn.query(insertQuery, [this.user?.id, comment.comment_article_ID, comment.id, comment.comment_group_ID, content, nickName, hash]);
    if (comment.id === comment.comment_group_ID) {
      await this.conn.query(`UPDATE comment SET replyCount=replyCount+1 WHERE id=?`, [comment.id]);
    } else {
      await this.conn.query(`UPDATE comment SET replyCount=replyCount+1 WHERE id=?`, [comment.id]);
      await this.conn.query(`UPDATE comment SET replyCount=replyCount+1 WHERE id=?`, [comment.comment_group_ID]);
    }
    await this.conn.query(`UPDATE article SET commentCount=commentCount+1, updatedAt=NOW() WHERE id=?`, [comment.comment_article_ID]);
    // 포인트
    
    if (this.user) {
      const pointClass = new Point(this.req, this.res, this.conn);
      const pointData = {
        user: this.user,
        type: 'createComment',
        point: board.commentPoint,
      };
      await pointClass.create(pointData);
    }
    // await this.conn.commit();
    // 알람
    const alarmClass = new Alarm(this.req, this.res, this.conn);
    const alarmData = {
      type: 'replyComment',
      userId: comment.comment_user_ID,
      relatedUserId: this.user?.id,
      boardId: board.id,
      articleId: article.id,
    };
    await alarmClass.create(alarmData);
    return true;
  }
  async update (commentId, data) {
    const comment = await this.get(commentId);
    data = Object.assign({
      content: comment.content,
      nickName: comment.nickName,
      password: null,
    }, data);
    let { content, nickName, password } = data;
    const tagRegex = new RegExp(/<[^>]*>/g);
    content = content.replace(tagRegex, '');
    content = content.replace(/\n/ig, '<br>');
    if (comment.comment_user_ID) {
      if (this.user?.id === comment.comment_user_ID || this.user?.isAdmin) {
        const query = `UPDATE comment SET content=?, nickName=? WHERE id=?`;
        const [result, ] = await this.conn.query(query, [content, nickName, commentId]);
        if (result.affectedRows) {
          return {
            status: true,
          };
        } else {
          return {
            status: false,
            message: '댓글 수정에 실패하였습니다',
          };
        }
      } else {
        return {
          status: false,
          message: '해당 유저가 아닙니다',
        };
      }
    } else {
      if (nickName, password) {
        const passwordCheck = bcrypt.compareSync(password, comment.password);
        if (passwordCheck) {
          const query = `UPDATE comment SET content=?, nickName=? WHERE id=?`;
          const [result, ] = await this.conn.query(query, [content, nickName, commentId]);
          if (result.affectedRows) {
            return {
              status: true,
            };
          } else {
            return {
              status: false,
              message: '댓글 수정에 실패하였습니다',
            };
          }
        } else {
          return {
            statas: false,
            message: '비밀번호가 다릅니다',
          };
        }
      } else {
        return {
          status: false,
          message: '입력값이 부족합니다',
        };
      }
    }
  }
  async remove (commentId, data) {
    const comment = await this.get(commentId);
    data = Object.assign({
      password: null,
    }, data);
    const { password } = data;

    // 비회원
    if (password) {
      const passwordCheck = bcrypt.compareSync(password, comment.password);
      if (!passwordCheck) {
        return {
          status: false,
          message: '비밀번호가 다릅니다',
        };
      }
    }

    const userClass = new User(this.req, this.res, this.conn);
    const boardClass = new Board(this.req, this.res, this.conn);
    const articleClass = new Article(this.req, this.res, this.conn);
    const user = await userClass.get(comment.comment_user_ID);
    const article = await articleClass.get(comment.comment_article_ID);
    const board = await boardClass.getById(article.article_board_ID);

    if (comment.comment_user_ID === this.user?.id || this.user?.isAdmin || !comment.comment_user_ID) {
      // this.conn.beginTransaction();
      await this.conn.query(`UPDATE comment SET status=0 WHERE id=?`, [commentId]);
      if (comment.comment_parent_ID && comment.comment_parent_ID === comment.comment_group_ID) {
        await this.conn.query(`UPDATE comment SET replyCount=replyCount-1 WHERE id=?`, [comment.comment_parent_ID]);
      } else if (comment.comment_parent_ID && comment.comment_parent_ID !== comment.comment_group_ID) {
        await this.conn.query(`UPDATE comment SET replyCount=replyCount-1 WHERE id=?`, [comment.comment_parent_ID]);
        await this.conn.query(`UPDATE comment SET replyCount=replyCount-1 WHERE id=?`, [comment.comment_group_ID]);
      }
      await this.conn.query(`UPDATE article SET commentCount=commentCount-1, updatedAt=NOW() WHERE id=?`, [comment.comment_article_ID]);
      
      // 포인트
      if (this.user) {
        const pointClass = new Point(this.req, this.res, this.conn);
        const pointData = {
          user,
          type: 'removeComment',
          point: board.commentPoint,
        };
        await pointClass.remove(pointData);
      }
      // await this.conn.commit();
      return {
        status: true,
      };
    } else {
      return {
        status: false,
        message: '권한이 없습니다',
      };
    }
  }
  async like (commentId) {
    const query = `SELECT *
    FROM userCommentLike
    WHERE userCommentLike_user_ID=? AND userCommentLike_comment_ID=?`;
    const [duplicateResult, ] = await this.conn.query(query, [this.user.id, commentId]);
    if (!duplicateResult.length) {
      await this.conn.query(`INSERT INTO userCommentLike (userCommentLike_user_ID, userCommentLike_comment_ID) VALUES (?, ?)`, [this.user.id, commentId]);
      await this.conn.query(`UPDATE comment SET likeCount=likeCount+1 WHERE id=?`, [commentId]);
    } else {
      await this.conn.query(`DELETE FROM userCommentLike WHERE id=?`, [duplicateResult[0].id]);
      await this.conn.query(`UPDATE comment SET likeCount=likeCount-1 WHERE id=?`, [commentId]);
    }
    return true;
  }
  async unlike (commentId) {
    const query = `SELECT *
    FROM userCommentUnlike
    WHERE userCommentUnlike_user_ID=? AND userCommentUnlike_comment_ID=?`;
    const [duplicateResult, ] = await this.conn.query(query, [this.user.id, commentId]);
    if (!duplicateResult.length) {
      await this.conn.query(`INSERT INTO userCommentUnlike (userCommentUnlike_user_ID, userCommentUnlike_comment_ID) VALUES (?, ?)`, [this.user.id, commentId]);
      await this.conn.query(`UPDATE comment SET unlikeCount=unlikeCount+1 WHERE id=?`, [commentId]);
    } else {
      await this.conn.query(`DELETE FROM userCommentUnlike WHERE id=?`, [duplicateResult[0].id]);
      await this.conn.query(`UPDATE comment SET unlikeCount=unlikeCount-1 WHERE id=?`, [commentId]);
    }
    return true;
  }
  async getComments (articleId) {
    const query = `SELECT c.*, c.nickName AS nonMember, u.id AS userId, u.nickName AS nickName, u.permission AS permission, p.title AS permissionName, p.isAdmin AS authorIsAdmin, u.image AS userImage, b.useAnonymous
    FROM comment AS c
    LEFT JOIN user AS u
    ON c.comment_user_ID = u.id
    LEFT JOIN permission AS p
    ON u.permission = p.permission
    LEFT JOIN article AS a
    ON c.comment_article_ID = a.id
    LEFT JOIN board AS b
    ON a.article_board_ID = b.id
    WHERE c.comment_article_ID=? AND c.comment_parent_ID IS NULL`;
    const [comments, ] = await this.conn.query(query, [articleId]);
    for await (let comment of comments) {
      comment = await this.setInfo(comment);
      const repliesQuery = `SELECT c.*, c.nickName AS nonMember, u.id AS userId, u.nickName AS nickName, u.permission AS permission, p.title AS permissionName, p.isAdmin AS authorIsAdmin, u.image AS userImage, b.useAnonymous
      FROM comment AS c
      LEFT JOIN user AS u
      ON c.comment_user_ID = u.id
      LEFT JOIN permission AS p
      ON u.permission = p.permission
      LEFT JOIN article AS a
      ON c.comment_article_ID = a.id
      LEFT JOIN board AS b
      ON a.article_board_ID = b.id
      WHERE c.comment_group_ID=? AND c.id!=?`;
      const [replies, ] = await this.conn.query(repliesQuery, [comment.id, comment.id]);
      for await (let reply of replies) {
        reply = await this.setInfo(reply);
        if (reply.comment_parent_ID !== reply.comment_group_ID) {
          const parenyReply = replies.find(r => r.id === reply.comment_parent_ID);
          reply.parentNickName = parenyReply.nickName;
        }
      }
      comment.replies = replies;
    }
    return comments;
  }
  async setInfo (comment) {
    if (this.user?.id === comment.comment_user_ID) {
      comment.isAuthor = true;
    } else {
      comment.isAuthor = false;
    }
    
    // 회원 좋아요 확인
    if (this.user) {
      const [userLikeResult, ] = await this.conn.query(`SELECT * FROM userCommentLike WHERE userCommentLike_user_ID=? AND userCommentLike_comment_ID=?`, [this.user.id, comment.id]);
      const userLike = userLikeResult.length ? 1 : 0;
      comment.userLike = userLike;
    } else {
      comment.userLike = 0;
    }

    comment.content = comment.content.replace(/\n/ig, '<br>');

    comment.datetime = datetime(comment.createdAt);
    // 댓글 상태
    if (!comment.status) comment.content = '삭제된 댓글 입니다.';
    // 회원 이미지
    if (comment.userImage && (!comment.useAnonymous || comment.authorIsAdmin)) {
      comment.userImage = `${s3.host}/userImage/${comment.userImage}`;
    } else {
      comment.userImage = `/assets/userImage.svg`;
    }

    if (Number(comment.permissionName)) {
      comment.permissionName = `LV ${Number(comment.permissionName)}`;
    }

    // 비회원
    if (!comment.comment_user_ID) {
      comment.nickName = comment.nonMember;
      comment.permissionName = '비회원';
    }

    // 익명
    const isAnonymous = comment.useAnonymous && (comment.comment_user_ID !== this.user?.id && !this.user?.isAdmin) && !comment.authorIsAdmin;
    if (isAnonymous) {
      comment.nickName = '익명';
      comment.permissionName = null;
    }

    // 등급 이미지
    const permissionImage = this.res.locals.permissions.find(p => p.permission === comment.permission);
    if (permissionImage?.image) {
      comment.permissionImage = `${s3.host}/permission/${permissionImage.image}`;
    } else {
      comment.permissionImage = `/assets/permission/${comment.permission}.svg`;
    }

    return comment;
  }
}

module.exports = Comment;