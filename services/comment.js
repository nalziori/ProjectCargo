const bcrypt = require('bcrypt');
const Class = require('./class');
const User = require('./user');
const Board = require('./board');
const Article = require('./article');
const Point = require('./point');
const Alarm = require('./alarm');
const datetime = require('../middleware/datetime');
const config = require('../middleware/config');
//const { stringify } = require('crypto-js/enc-base64');

const SALT_COUNT = 10;

const s3 = config.getS3();

class Comment extends Class {
  async get(commentId) {
    const query = `SELECT c.*, u.uId, u.nickName
    FROM comment AS c
    LEFT JOIN user AS u
    ON c.comment_user_ID = u.id
    WHERE c.id=?`;
    const [comments,] = await this.conn.query(query, [commentId]);
    if (comments.length) {
      const comment = comments[0];
      return comment;
    } else {
      return null;
    }
  }
  async create(articleId, data) {
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

    // const tagRegex = new RegExp(/<[^>]*>/g);
    // content = content.replace(tagRegex, '');

    // 비회원
    let hash = null;
    if (nickName && password) {
      const salt = bcrypt.genSaltSync(SALT_COUNT);
      hash = bcrypt.hashSync(password, salt);
    }

    //anonymous code init
    var set_anonymous;
    const [article_writer] = await this.conn.query('SELECT * FROM article WHERE id=?', [articleId]);
    console.log(articleId, article_writer[0].article_user_ID, this.user?.id);
    if (this.user?.id == article_writer[0].article_user_ID) {   //작성자 댓글
      //const update_commentcount = await this.conn.query('UPDATE article SET commentCount=commentCount+1 updatedAt=NOW() WHERE id=?', [articleId]);
      //const set_anonymous_comment = await this.conn.query('UPDATE comment SET anonymout_code=0, updatedAt=NOW() WHERE id=?', [result.insertId]);
      set_anonymous = 0;
    }
    else {
      const query = 'SELECT * FROM comment WHERE comment_article_ID=?';
      const [all_comments_of_article] = await this.conn.query(query, [articleId]);
      var wrote_before = 0;
      var written_comment = 0;  //이전에 작성한 코멘트 
      if (all_comments_of_article.length) { //코멘트가 있을때
        for (var i = 0; i <= all_comments_of_article.length; i++) {
          var id = all_comments_of_article[i]?.comment_user_ID;
          console.log("id " +id);
          if (id == this.user?.id) {
            wrote_before = 1;
            written_comment = i;
            break;
          }
          else {
            wrote_before = 2;
          }
        }
        if (wrote_before == 1) {  //쓴적 있는 사람
          // const set_anonymous_comment = await this.conn.query('UPDATE comment SET anonymout_code=?, updatedAt=NOW() WHERE id=?', [all_comments_of_article[written_comment].anonymous_code, result.insertId]);
          set_anonymous = all_comments_of_article[written_comment].anonymous_code;
          console.log("wrote before once");
        } else if (wrote_before == 2) {  //처음 쓰는 사람
          const update_commentcount = await this.conn.query('UPDATE article SET anonymous_count=anonymous_count+1, updatedAt=NOW() WHERE id=?', [articleId]);
          const get_anonymous_count = await this.conn.query('SELECT * FROM article WHERE id=?', [articleId]);
          // const set_anonymous_comment = await this.conn.query('UPDATE comment SET anonymout_code=?, updatedAt=NOW() WHERE id=?', [get_anonymous_count.anonymous_count, result.insertId]);
          set_anonymous = get_anonymous_count.anonymous_count;
          console.log("never wrote ever");
        } else {  //반복문 에러
          console.log("loop error");
        }
      } else {  //코멘트가 없을때 첫번째 코멘트
        // const update_commentcount = await this.conn.query('UPDATE article SET commentCount=commentCount+1 updatedAt=NOW() WHERE id=?', [articleId]);
        // console.log("comments read length error");
        set_anonymous = 1;
      }
    }
    // this.conn.beginTransaction();
    const query = `INSERT INTO comment
    (comment_user_ID, comment_article_ID, content, nickName, password, anonymous_code)
    VALUES (?, ?, ?, ?, ?, ?)`;

    const [result,] = await this.conn.query(query, [this.user?.id, articleId, content, nickName, hash, set_anonymous]);
    if (result.insertId) {
      // 포인트
      const update_commentcount = await this.conn.query('UPDATE article SET commentCount=commentCount+1, updatedAt=NOW() WHERE id=?', [articleId]);

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
  async reply(commentId, data) {
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

    // const tagRegex = new RegExp(/<[^>]*>/g);
    // content = content.replace(tagRegex, '');

    // 비회원
    let hash = null;
    if (nickName && password) {
      const salt = bcrypt.genSaltSync(SALT_COUNT);
      hash = bcrypt.hashSync(password, salt);
    }

    //anonymous code init
    var set_anonymous;
    const article_writer = await this.conn.query('SELECT * FROM article WHERE id=?', [comment.comment_article_ID]);
    if (this.user?.id == article_writer.article_user_ID) {   //작성자 댓글
      //const update_commentcount = await this.conn.query('UPDATE article SET commentCount=commentCount+1 updatedAt=NOW() WHERE id=?', [articleId]);
      //const set_anonymous_comment = await this.conn.query('UPDATE comment SET anonymout_code=0, updatedAt=NOW() WHERE id=?', [result.insertId]);
      set_anonymous = 0;
    }
    else {
      const query = 'SELECT * FROM comment WHERE comment_article_ID=?';
      const [all_comments_of_article] = await this.conn.query(query, [comment.comment_article_ID]);
      var wrote_before = 0;
      var written_comment = 0;  //이전에 작성한 코멘트 
      if (all_comments_of_article.length) { //코멘트가 있을때
        for (var i = 0; i <= all_comments_of_article.length; i++) {
          if (all_comments_of_article[i].comment_user_ID == this.user?.id) {
            wrote_before = 1;
            written_comment = i;
            break;
          }
          else {
            wrote_before = 2;
          }
        }
        if (wrote_before == 1) {  //쓴적 있는 사람
          // const set_anonymous_comment = await this.conn.query('UPDATE comment SET anonymout_code=?, updatedAt=NOW() WHERE id=?', [all_comments_of_article[written_comment].anonymous_code, result.insertId]);
          const update_replycount = await this.conn.query('UPDATE comment SET replyCount=replycount+1, updatedAt=NOW() WHERE comment_user_ID=?', [comment.id]);
          set_anonymous = all_comments_of_article[written_comment].anonymous_code;
          console.log("wrote before once");
        } else if (wrote_before == 2) {  //처음 쓰는 사람
          const update_anonymouscount = await this.conn.query('UPDATE article SET anonymous_count=anonymous_count+1, updatedAt=NOW() WHERE id=?', [comment.comment_article_ID]);
          const update_replycount = await this.conn.query('UPDATE comment SET replyCount=replycount+1, updatedAt=NOW() WHERE comment_user_ID=?', [comment.id]);
          const get_anonymous_count = await this.conn.query('SELECT * FROM article WHERE id=?', [comment.comment_article_ID]);
          // const set_anonymous_comment = await this.conn.query('UPDATE comment SET anonymout_code=?, updatedAt=NOW() WHERE id=?', [get_anonymous_count.anonymous_count, result.insertId]);
          set_anonymous = get_anonymous_count;
          console.log("never wrote ever");
        } else {  //반복문 에러
          console.log("loop error");
        }
      } else {  //코멘트가 없을때 첫번째 코멘트
        // const update_commentcount = await this.conn.query('UPDATE article SET commentCount=commentCount+1 updatedAt=NOW() WHERE id=?', [articleId]);
        // console.log("comments read length error");
        set_anonymous = 1;
      }
    }
    // this.conn.beginTransaction();
    const insertQuery = `INSERT INTO comment
    (comment_user_ID, comment_article_ID, comment_parent_ID, comment_group_ID, content, nickName, password, anonymous_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result,] = await this.conn.query(insertQuery, [this.user?.id, comment.comment_article_ID, comment.id, comment.comment_group_ID, content, nickName, hash, set_anonymous]);
    if (result.insertId) {
      const update_commentcount = await this.conn.query('UPDATE article SET commentCount=commentCount+1, updatedAt=NOW() WHERE id=?', [comment.comment_article_ID]);
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
  }

  async update(commentId, data) {
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
          const [result,] = await this.conn.query(query, [content, nickName, commentId]);
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
            const [result,] = await this.conn.query(query, [content, nickName, commentId]);
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
  
  async remove(commentId, data) {
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
  async like(commentId) {
    const query = `SELECT *
    FROM userCommentLike
    WHERE userCommentLike_user_ID=? AND userCommentLike_comment_ID=?`;
    const [duplicateResult,] = await this.conn.query(query, [this.user.id, commentId]);
    if (!duplicateResult.length) {
      await this.conn.query(`INSERT INTO userCommentLike (userCommentLike_user_ID, userCommentLike_comment_ID) VALUES (?, ?)`, [this.user.id, commentId]);
      await this.conn.query(`UPDATE comment SET likeCount=likeCount+1 WHERE id=?`, [commentId]);
    } else {
      await this.conn.query(`DELETE FROM userCommentLike WHERE id=?`, [duplicateResult[0].id]);
      await this.conn.query(`UPDATE comment SET likeCount=likeCount-1 WHERE id=?`, [commentId]);
    }
    return true;
  }
  async unlike(commentId) {
    const query = `SELECT *
    FROM userCommentUnlike
    WHERE userCommentUnlike_user_ID=? AND userCommentUnlike_comment_ID=?`;
    const [duplicateResult,] = await this.conn.query(query, [this.user.id, commentId]);
    if (!duplicateResult.length) {
      await this.conn.query(`INSERT INTO userCommentUnlike (userCommentUnlike_user_ID, userCommentUnlike_comment_ID) VALUES (?, ?)`, [this.user.id, commentId]);
      await this.conn.query(`UPDATE comment SET unlikeCount=unlikeCount+1 WHERE id=?`, [commentId]);
    } else {
      await this.conn.query(`DELETE FROM userCommentUnlike WHERE id=?`, [duplicateResult[0].id]);
      await this.conn.query(`UPDATE comment SET unlikeCount=unlikeCount-1 WHERE id=?`, [commentId]);
    }
    return true;
  }
  async getComments(articleId) {
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
    const [comments,] = await this.conn.query(query, [articleId]);
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
      const [replies,] = await this.conn.query(repliesQuery, [comment.id, comment.id]);
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
  async setInfo(comment) {
    if (this.user?.id === comment.comment_user_ID) {
      comment.isAuthor = true;
    } else {
      comment.isAuthor = false;
    }

    // 회원 좋아요 확인
    if (this.user) {
      const [userLikeResult,] = await this.conn.query(`SELECT * FROM userCommentLike WHERE userCommentLike_user_ID=? AND userCommentLike_comment_ID=?`, [this.user.id, comment.id]);
      const userLike = userLikeResult.length ? 1 : 0;
      comment.userLike = userLike;
    } else {
      comment.userLike = 0;
    }

    comment.parentNickName = '익명';
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
      //article.anonymous_count
      //comment.anonymous_code
      //댓글을 익명설정으로 작성 -> 게시글 작성자가 아닐경우-> article.annoymous_count+1->comment.anonymous_code로 복사->comment.nickname에 익명 + code
      //                        -> 게시글 작성자인 경우 -> comment.nickname에 익명 + 작성자
      const query = 'SELECT * FROM article where article.id=?';
      const [writer,] = await this.conn.query(query, [comment.comment_article_ID]);
      //console.log("data : " + JSON.stringify(writer));
      const a = writer[0].article_user_ID;
      const b = comment.comment_user_ID;
      const [before,] = await this.conn.query('SELECT * FROM comment WHERE id=?', [comment.id]);
      var code = before[0].anonymous_code;
      const user = await this.conn.query('SELECT * FROM user WHERE id=?', [before[0].comment_user_ID]);
      if (a == b) {
        comment.nickName = '익명(작성자)';
        if (comment.permission == 3) {
          comment.permissionName = '수의대생';
        } else if (comment.permission == 10) {
          comment.permissionName = '관리자';
        } else {
          comment.permissionName = '수의사';
        }
      }
      //기존 유저 댓글 처리
      else if (code == 0) {
        comment.nickName = '익명';
        if (comment.permission == 3) {
          comment.permissionName = '수의대생';
        } else if (comment.permission == 10) {
          comment.permissionName = '관리자';
        } else {
          comment.permissionName = '수의사';
        }
      }
      else {
        const query = 'SELECT * FROM comment WHERE comment_user_ID = ? AND comment_article_ID=?';
        const [usedID,] = await this.conn.query(query, [comment.comment_user_ID, comment.comment_article_ID]);
        await this.conn.query('UPDATE comment SET anonymous_code=? WHERE comment_user_ID=? AND comment_article_ID=?', [usedID.anonymous_code, usedID.comment_user_ID, usedID.comment_article_ID]);
        var code = usedID[0].anonymous_code;
        comment.nickName = '익명' + code;
        if (comment.permission == 3) {
          comment.permissionName = '수의대생';
        } else if (comment.permission == 10) {
          comment.permissionName = '관리자';
        } else {
          comment.permissionName = '수의사';
        }
      }
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