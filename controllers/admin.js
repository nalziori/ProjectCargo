const { timezone } = require('../config');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault(timezone);
const pool = require('../middleware/database');
const flash = require('../middleware/flash');
const pagination = require('../middleware/pagination');
const hashCreate = require('../middleware/hash');
const favicon = require('../middleware/favicon');
const youtube = require('../middleware/youtube');
const datetime = require('../middleware/datetime');
const Parsing = require('../middleware/parsing');
const { getGeoCoding } = require('../middleware/offline');
const imageUpload = require('../middleware/imageUpload');
const doAsync = require('../middleware/doAsync');
const emptyCheck = require('../middleware/emptyCheck');
const count = require('../middleware/count');
const config = require('../middleware/config');
const Point = require('../services/point');
const Menu = require('../services/menu');
const User = require('../services/user');
const UserGroup = require('../services/userGroup');
const UserGroupBoard = require('../services/userGroupBoard');
const Board = require('../services/board');
const Category = require('../services/category');
const Article = require('../services/article');
const Comment = require('../services/comment');
const Message = require('../services/message');
const Report = require('../services/report');
const Banner = require('../services/banner');
const Go = require('../services/go');
const Permission = require('../services/permission');
const Setting = require('../services/setting');
const IndexBoardGroup = require('../services/indexBoardGroup');

/* AWS S3 */
const AWS = require('aws-sdk');
const s3Info = config.getS3();

const { accessKeyId, secretAccessKey, region, bucket, host, endpoint } = s3Info;

const spacesEndpoint = new AWS.Endpoint(endpoint);
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
});

exports.index = doAsync(async (req, res, next) => {
  res.redirect('/admin/log');
});

exports.log = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const pnQuery = `SELECT count(*) AS count FROM log`;
    const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
    const query = `SELECT l.*, a.title AS title, b.title AS boardName, b.slug AS boardSlug
    FROM log AS l
    LEFT JOIN article AS a
    ON l.log_article_ID = a.id
    LEFT JOIN board AS b
    ON a.article_board_ID = b.id
    ORDER BY id DESC
    ${pn.queryLimit}`;
    const [logs, ] = await conn.query(query);
    logs.forEach(log => {
      log.datetime = moment(log.viewDate).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
    });
    const { today, yesterday, month } = await count.getCount();

    res.render('admin/log', {
      pageTitle: `로그 - ${res.locals.setting.siteName}`,
      logs,
      pn,
      today,
      yesterday,
      month,
    });
  } finally {
    conn.release();
  }
});

exports.user = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { searchType, keyword } = req.query;
    const userClass = new User(req, res, conn);
    const userCount = await userClass.getTotalCount();
    const data = {
      searchType,
      keyword,
    };
    const { users, pn } = await userClass.getUsersByPagination(data, 10);
    res.render('admin/user', {
      pageTitle: `회원 - ${res.locals.setting.siteName}`,
      users,
      userCount,
      pn,
      searchType,
      keyword,
    });
  } finally {
    conn.release();
  }
});

exports.userNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { submit } = req.body;
    const userHash = hashCreate(6);
    let uId = null, password = null, nickName = null, email = null, permission = null, workingUser = null;
    if (submit === 'new') {
      uId = req.body.uId;
      password = req.body.password;
      nickName = req.body.nickName;
      email = req.body.email;
      permission = req.body.permission;
      workingUser = req.body.workingUser || 0;
    } else if (submit === 'random') {
      uId = userHash;
      password = userHash;
      nickName = userHash;
      email = userHash;
      permission = 1;
      workingUser = 1;
    }
    if (emptyCheck(uId, password, nickName, email, permission, workingUser)) {
      const data = {
        uId,
        password,
        nickName,
        email,
        permission,
        workingUser,
        emailAuthentication: 1,
      };
      const userClass = new User(req, res, conn);
      try {
        await userClass.create(data);
        flash.create({
          status: true,
          message: '회원이 생성되었습니다',
        });
      } catch (e) {
        flash.create({
          status: false,
          message: e.message,
        });
      }
    } else {
      flash.create({
        status: false,
        message: '모든 입력란을 입력해주세요',
      });
    }
    res.redirect('/admin/user');
  } finally {
    conn.release();
  }
});

exports.userEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { userId } = req.params;
    const { submit } = req.body;
    const userClass = new User(req, res, conn);
    //const pointClass = new Point(req, res, conn);
    if (submit === 'edit') {
      const { userGroup, uId, password, nickName, email, phone, permission } = req.body;
      //const { pointMethod, point } = req.body;
      const workingUser = req.body.workingUser || 0;
      const data = {
        userGroup,
        uId,
        password,
        nickName,
        email,
        phone,
        permission,
        workingUser,
      };
      /*
      if (pointMethod && point) {
        const user = await userClass.get(userId);
        if (pointMethod === 'create') {
          const data = {
            user,
            type: 'manual',
            point,
          };
          await pointClass.create(data);
        } else if (pointMethod === 'remove') {
          const data = {
            user,
            type: 'manual',
            point,
          };
          await pointClass.remove(data);
        }
      }
      await userClass.update(userId, data);
    } else if (submit === 'delete') {
      await userClass.remove(userId);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.menu = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const menuClass = new Menu(req, res, conn);
    const totalMenus = await menuClass.getMenus({ status: false });
    res.render('admin/menu', {
      pageTitle: `메뉴 - ${res.locals.setting.siteName}`,
      totalMenus,
    });
  } finally {
    conn.release();
  }
});

exports.menuNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { title, target } = req.body;
    if (title) {
      const data = {
        title,
        target,
      }
      const menuClass = new Menu(req, res, conn);
      await menuClass.create(data);
    } else {
      flash.create({
        status: false,
        message: '메뉴 이름을 입력해주세요',
      });
    }
    res.redirect('/admin/menu');
  } finally {
    conn.release();
  }
});

exports.menuEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { menuId } = req.params;
    const { submit } = req.body;
    const menuClass = new Menu(req, res, conn);
    if (submit === 'add') {
      const data = {
        parentId: menuId,
        title: '',
        target: '',
      };
      await menuClass.create(data);
    } else if (submit === 'status') {
      const menu = await menuClass.get(menuId);
      if (menu.status) {
        const data = {
          status: 0,
        };
        menuClass.update(menuId, data);
      } else {
        const data = {
          status: 1,
        };
        menuClass.update(menuId, data);
      }
    } else if (submit === 'edit') {
      const { title, target, viewOrder } = req.body;
      const data = {
        title,
        target,
        viewOrder,
      };
      await menuClass.update(menuId, data);
    } else if (submit === 'delete') {
      await menuClass.remove(menuId);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.board = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const boardClass = new Board(req, res, conn);
    const { boards, pn } = await boardClass.getBoardsByPagination(10);
    res.render('admin/board', {
      pageTitle: `게시판 - ${res.locals.setting.siteName}`,
      boards,
      pn,
    });
  } finally {
    conn.release();
  }
});

exports.boardNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { title, type } = req.body;
    const slug = req.body.slug || hashCreate(6);
    const boardClass = new Board(req, res, conn);
    const userGroupBoardClass = new UserGroupBoard(req, res, conn);
    const data = {
      title,
      slug,
      type,
    }
    try {
      const boardId = await boardClass.create(data);
      const userGroupBoardData = {
        boardId,
      };
      await userGroupBoardClass.create(userGroupBoardData);
    } catch (e) {
      flash.create({
        status: false,
        message: e.message,
      });
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.boardEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { boardId } = req.params;
    const { submit } = req.body;
    const boardClass = new Board(req, res, conn);
    if (submit === 'edit') {
      const { title, slug, type, listCount, listPermission, readPermission, writePermission, commentPermission } = req.body;
      const data = {
        title,
        slug,
        type,
        listCount,
        listPermission,
        readPermission,
        writePermission,
        commentPermission,
      };
      boardClass.update(boardId, data);
    } else if (submit === 'delete') {
      boardClass.remove(boardId);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.boardDetail = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    const { boardId } = req.params;
    const boardClass = new Board(req, res, conn);
    const userGroupClass = new UserGroup(req, res, conn);
    const userGroups = await userGroupClass.getUserGroupsByBoardId(boardId);
    if (method === 'GET') {
      const board = await boardClass.getById(boardId, { categories: true });
      res.render('admin/boardDetail', {
        pageTitle: ``,
        board,
        userGroups,
      });
    } else if (method === 'POST') {
      const { submit } = req.body;
      if (submit === 'detail') {
        const { writePoint, commentPoint, readPoint, useSecret, useAnonymous, useOnce, useLinks, useFiles, useUserGroupPermission, useUserAlarm, useAdminAlarm } = req.body;
        const data = {
          writePoint,
          commentPoint,
          readPoint,
          useSecret,
          useAnonymous,
          useOnce,
          useLinks,
          useFiles,
          useUserGroupPermission,
          useUserAlarm,
          useAdminAlarm,
        };
        await boardClass.update(boardId, data);
      } else if (submit === 'customField') {
        const { customFieldTitle01, customFieldTitle02, customFieldTitle03, customFieldTitle04, customFieldTitle05, customFieldTitle06, customFieldTitle07, customFieldTitle08, customFieldTitle09, customFieldTitle10 } = req.body;
        const useCustomField01 = req.body.useCustomField01 || 0;
        const useCustomField02 = req.body.useCustomField02 || 0;
        const useCustomField03 = req.body.useCustomField03 || 0;
        const useCustomField04 = req.body.useCustomField04 || 0;
        const useCustomField05 = req.body.useCustomField05 || 0;
        const useCustomField06 = req.body.useCustomField06 || 0;
        const useCustomField07 = req.body.useCustomField07 || 0;
        const useCustomField08 = req.body.useCustomField08 || 0;
        const useCustomField09 = req.body.useCustomField09 || 0;
        const useCustomField10 = req.body.useCustomField10 || 0;
        const data = {
          useCustomField01,
          useCustomField02,
          useCustomField03,
          useCustomField04,
          useCustomField05,
          useCustomField06,
          useCustomField07,
          useCustomField08,
          useCustomField09,
          useCustomField10,
          customFieldTitle01,
          customFieldTitle02,
          customFieldTitle03,
          customFieldTitle04,
          customFieldTitle05,
          customFieldTitle06,
          customFieldTitle07,
          customFieldTitle08,
          customFieldTitle09,
          customFieldTitle10,
        };
        await boardClass.update(boardId, data);
      }
      res.redirect(req.headers.referer);
    }
  } finally {
    conn.release();
  }
});

exports.boardDetailPermission = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { boardId, userGroupId } = req.params;
    const listPermission = req.body.listPermission || 0;
    const readPermission = req.body.readPermission || 0;
    const writePermission = req.body.writePermission || 0;
    const commentPermission = req.body.commentPermission || 0;
    const data = {
      listPermission,
      readPermission,
      writePermission,
      commentPermission,
    };
    const userGroupBoardClass = new UserGroupBoard(req, res, conn);
    await userGroupBoardClass.update(boardId, userGroupId, data);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.categoryNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { boardId, title } = req.body;
    const categoryClass = new Category(req, res, conn);
    const data = {
      title,
    }
    await categoryClass.create(boardId, data);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.categoryEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { categoryId } = req.params;
    const { submit } = req.body;
    const categoryClass = new Category(req, res, conn);
    if (submit === 'edit') {
      const { title, viewOrder } = req.body;
      const data = {
        title,
        viewOrder,
      };
      await categoryClass.update(categoryId, data);
    } else if (submit === 'delete') {
      await categoryClass.remove(categoryId);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.article = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { searchType, keyword } = req.query;
    const articleClass = new Article(req, res, conn);
    const data = {
      searchType,
      keyword,
      images: false,
      datetimeType: 'dateTime',
    };
    const { articles, pn } = await articleClass.getArticles(data);
    const boardClass = new Board(req, res, conn);
    const boards = await boardClass.getBoards();
    res.render('admin/article', {
      pageTitle: `게시글 - ${res.locals.setting.siteName}`,
      articles,
      boards,
      pn,
      searchType,
      keyword,
    });
  } finally {
    conn.release();
  }
});

exports.articleEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { articleId } = req.params;
    const { submit } = req.body;
    const userClass = new User(req, res, conn);
    const articleClass = new Article(req, res, conn);
    if (submit === 'status') {
      const article = await articleClass.get(articleId);
      if (article.status === 2) {
        const data = {
          status: 1,
        };
        await articleClass.update(articleId, data);
      } else if (article.status === 1) {
        const data = {
          status: 2,
        };
        await articleClass.update(articleId, data);
      }
    } else if (submit === 'edit') {
      const { board, uId, viewCount, datetime } = req.body;
      const user = await userClass.getByUidOrEmail(uId);
      const data = {
        boardId: board,
        userId: user.id,
        viewCount,
        updatedAt: moment(datetime).tz('UTC').format('YYYY-MM-DD HH:mm:ss'),
        createdAt: moment(datetime).tz('UTC').format('YYYY-MM-DD HH:mm:ss'),
      };
      await articleClass.update(articleId, data);
    } else if (submit === 'delete') {
      await articleClass.remove(articleId);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.comment = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { searchType, keyword } = req.query;
    let pn = null;
    let comments = [];
    if (searchType === 'content') {
      const pnQuery = `SELECT count(*) AS count
      FROM comment
      WHERE status=1 AND content LIKE CONCAT('%','${keyword}','%')`;
      pn = await pagination(pnQuery, req.query, 'page', 10, 5);
      const query = `SELECT c.*, u.uId AS uId, u.nickName AS nickName
      FROM comment AS c
      LEFT JOIN user AS u
      ON c.comment_user_ID = u.id
      WHERE status = 1 AND content LIKE CONCAT('%',?,'%')
      ORDER BY id DESC
      ${pn.queryLimit}`;
      [comments, ] = await conn.query(query, [keyword]);
    } else {
      const pnQuery = `SELECT count(*) AS count FROM comment WHERE status=1`;
      pn = await pagination(pnQuery, req.query, 'page', 10, 5);
      const query = `SELECT c.*, u.uId AS uId, u.nickName AS nickName
      FROM comment AS c
      LEFT JOIN user AS u
      ON c.comment_user_ID = u.id
      WHERE status = 1
      ORDER BY id DESC
      ${pn.queryLimit}`;
      [comments, ] = await conn.query(query);
    }
    comments.forEach(c => {
      c.datetime = moment(c.createdAt).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
    });
    res.render('admin/comment', {
      pageTitle: `댓글 - ${res.locals.setting.siteName}`,
      comments,
      pn,
      searchType,
      keyword,
    });
  } finally {
    conn.release();
  }
});

exports.commentEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { commentId } = req.params;
    const { submit } = req.body;
    const user = res.locals.user;
    if (submit === 'edit') {
      const { uId, datetime, content } = req.body;
      const [users, ] = await conn.query(`SELECT * FROM user WHERE uId=?`, [uId]);
      if (users.length) {
        const user = users[0];
        await conn.query(`UPDATE comment SET comment_user_ID=?, content=?, updatedAt=?, createdAt=? WHERE id=?`, [user.id, content, datetime, datetime, commentId]);
      } else {
        flash.create({
          status: false,
          message: `유저가 존재하지 않습니다`,
        });
      }
    } else if (submit === 'delete') {
      const [comments, ] = await conn.query(`SELECT * FROM comment WHERE id=?`, [commentId]);
      if (comments.length) {
        const comment = comments[0];
        // Delete Comment
        if (comment.comment_user_ID === user.id || user.isAdmin) {
          await conn.query(`UPDATE comment SET status=? WHERE id=?`, [0, comment.id]);
          await conn.query(`UPDATE article SET commentCount=commentCount-1, updatedAt=NOW() WHERE id=?`, [comment.comment_article_ID]);
          await conn.query(`UPDATE comment SET replyCount=replyCount-1 WHERE id=?`, [comment.parent_comment_id]);
          if (comment.parent_comment_id && comment.parent_comment_id != comment.comment_group_id) await conn.query(`UPDATE comment SET replyCount=replyCount-1 WHERE id=?`, [comment.comment_group_id]);
        }
      }
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.chat = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const pnQuery = `SELECT count(*) AS count FROM chat`;
    const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
    const query = `SELECT c.*, u.nickName AS nickName
    FROM chat AS c
    LEFT JOIN user AS u
    ON c.chat_user_ID = u.id
    ORDER BY c.id DESC
    ${pn.queryLimit}`;
    const [chats, ] = await conn.query(query);
    chats.forEach(c => {
      c.datetime = moment(c.createdAt).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
    });
    res.render('admin/chat', {
      pageTitle: `채팅 - ${res.locals.setting.siteName}`,
      chats,
      pn,
    });
  } finally {
    conn.release();
  }
});

exports.chatEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { chatId } = req.params;
    const { submit } = req.body;
    const { page } = req.query;
    if (submit === 'edit') {
      const { message } = req.body;
      const fixed = req.body.fixed || 0;
      await conn.query(`UPDATE chat SET message=?, fixed=? WHERE id=?`, [message, fixed, chatId]);
    } else if (submit === 'delete') {
      await conn.query(`DELETE FROM chat WHERE id=?`, [chatId]);
    }
    if (page) {
      res.redirect(`/admin/chat?page=${page}`);
    } else {
      res.redirect('/admin/chat');
    }
  } finally {
    conn.release();
  }
});

exports.chatDelete = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.query(`DELETE FROM chat`);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.point = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const pnQuery = `SELECT count(*) AS count FROM point WHERE point != 0`;
    const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
    const query = `SELECT p.*, u.uId AS uId, u.nickName AS nickName
    FROM point AS p
    LEFT JOIN user AS u
    ON p.point_user_ID = u.id
    WHERE p.point != 0
    ORDER BY p.id DESC
    ${pn.queryLimit}`;
    const [points, ] = await conn.query(query);
    points.forEach(point => {
      point.datetime = datetime(point.createdAt);
    });
    res.render('admin/point', {
      pageTitle: `포인트 - ${res.locals.setting.siteName}`,
      points,
      pn,
    });
  } finally {
    conn.release();
  }
});

exports.message = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const messageClass = new Message(req, res, conn);
    const { messages, pn } = await messageClass.getMessagesByPagination(10);
    res.render('admin/message', {
      pageTitle: `메시지 - ${res.locals.setting.siteName}`,
      messages,
      pn,
    });
  } finally {
    conn.release();
  }
});

exports.messageEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { messageId } = req.params;
    const { submit } = req.body;
    const messageClass = new Message(req, res, conn);
    if (submit === 'edit') {

    } else if (submit === 'delete') {
      await messageClass.remove(messageId);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.report = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const reportClass = new Report(req, res, conn);
    const { reports, pn } = await reportClass.getReports();
    res.render('admin/report', {
      pageTitle: `리포트 - ${res.locals.setting.siteName}`,
      reports,
      pn,
    });
  } finally {
    conn.release();
  }
});

exports.reportEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { reportId } = req.params;
    const { submit } = req.body;
    const reportClass = new Report(req, res, conn);
    const report = await reportClass.get(reportId);
    if (report.report_article_ID) {
      const articleClass = new Article(req, res, conn);
      await articleClass.remove(report.report_article_ID);
    } else if (report.report_comment_ID) {
      const commentClass = new Comment(req, res, conn);
      await commentClass.remove(report.report_comment_ID);
    } else if (report.report_message_ID) {
      const messageClass = new Message(req, res, conn);
      await messageClass.remove(report.report_message_ID);
    }
    const data = {
      status: 0,
    };
    await reportClass.update(reportId, data);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.userGroup = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const userGroupClass = new UserGroup(req, res, conn);
    const userGroups = await userGroupClass.getUserGroups();
    res.render('admin/userGroup', {
      pageTitle: `리포트 - ${res.locals.setting.siteName}`,
      userGroups,
    });
  } finally {
    conn.release();
  }
});

exports.userGroupNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { title, slug } = req.body;
    const userGroupClass = new UserGroup(req, res, conn);
    const data = {
      title,
      slug,
    };
    const userGroupId = await userGroupClass.create(data);
    const userGroupBoardClass = new UserGroupBoard(req, res, conn);
    const userGroupBoardData = {
      userGroupId,
    };
    await userGroupBoardClass.create(userGroupBoardData);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.userGroupEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { userGroupId } = req.params;
    const { submit } = req.body;
    const userGroupClass = new UserGroup(req, res, conn);
    if (submit === 'edit') {
      const { title, slug, viewOrder } = req.body;
      const data = {
        title,
        slug,
        viewOrder,
      };
      await userGroupClass.update(userGroupId, data);
    } else if (submit === 'delete') {
      await userGroupClass.remove(userGroupId);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.pointWithdraw = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { pointWithdrawId } = req.params;
    const { method } = req;
    if (method === 'GET') {
      const pnQuery = `SELECT count(*) AS count FROM pointWithdraw WHERE status = 1`;
      const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
      const query = `SELECT p.*, u.nickName
      FROM pointWithdraw AS p
      JOIN user AS u
      ON pointWithdraw_user_ID = u.id
      WHERE p.status = 1
      ORDER BY p.id DESC
      ${pn.queryLimit}`;
      const [pointWithDrawList, ] = await conn.query(query);
      pointWithDrawList.forEach(p => {
        p.datetime = moment(p.createdAt).tz(timezone).format('YY-MM-DD HH:mm:ss');
      });
      res.render('admin/pointWithdraw', {
        pageTitle: `포인트 출금 - ${res.locals.setting.siteName}`,
        pointWithDrawList,
        pn,
      });
    } else if (method === 'POST') {
      const { submit } = req.body;
      if (submit === 'complete') {
        await conn.query(`UPDATE pointWithdraw SET status=0 WHERE id=?`, [pointWithdrawId]);
      } else if (submit === 'reject') {
        const { userId, point } = req.body;
        // 포인트 복구
        await conn.query(`UPDATE user SET point=point+? WHERE id=?`, [point, userId]);
        await conn.query(`DELETE FROM pointWithdraw WHERE id=?`, [pointWithdrawId]);
        await conn.query(`INSERT INTO point (point_user_ID, type, point) VALUES (?, ?, ?)`, [userId, 'withdrawReject', point]);
      }
      res.redirect('/admin/pointWithdraw');
    }
  } finally {
    conn.release();
  }
});

exports.page = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { page } = req.query;
    const pnQuery = `SELECT count(*) AS count FROM page`;
    const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
    const query = `SELECT *
    FROM page
    ORDER BY id DESC
    ${pn.queryLimit}`;
    const [pages, ] = await conn.query(query);
    res.render('admin/page', {
      pageTitle: `페이지 - ${res.locals.setting.siteName}`,
      pages,
      pn,
      page,
    });
  } finally {
    conn.release();
  }
});

exports.pageNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    if (method === 'GET') {
      if (res.locals.setting.editor === 'engine') {
        res.render('admin/pageNewClassic', {
          pageTitle: `페이지 - ${res.locals.setting.siteName}`,
        });
      } else if (res.locals.setting.editor === 'ckeditor') {
        const hash = hashCreate(6);
        const [result, ] = await conn.query(`INSERT INTO page (title, slug, content, status) VALUES (?, ?, ?, ?)`, ['', hash, '', 0]);
        if (result.insertId) {
          const pageId = result.insertId;
          res.render('admin/pageNewClassic', {
            pageTitle: `페이지 - ${res.locals.setting.siteName}`,
            pageId,
          });
        }
      }
    } else if (method === 'POST') {
      const { pageId, type, title, html, css } = req.body;
      const slug = req.body.slug || hashCreate(6);
      let { content } = req.body;
      
      // Images
      const imageRegex = /\/page\/([^"]+)">/ig;
      const keys = Array.from(content.matchAll(imageRegex)).map(match => match[1]);
      for await (let key of keys) {
        await conn.query(`INSERT INTO image (image_page_ID, image) VALUES (?, ?)`, [pageId, key]);
      }
      // 하단 공백 제거
      content = content.replace(/((<p>&nbsp;<\/p>)*$)/, '');

      const [result, ] = await conn.query(`UPDATE page SET type=?, title=?, slug=?, content=?, html=?, css=?, status=? WHERE id=?`, [type, title, slug, content, html, css, 1, pageId]);
      if (result.affectedRows) {
        flash.create({
          status: true,
          message: '페이지 생성에 성공했습니다',
        });
        res.redirect('/admin/page');
      } else {
        flash.create({
          status: false,
          message: '페이지 생성에 실패했습니다',
        });
        res.redirect('/admin/page/new');
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    conn.release();
  }
});

exports.pageEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { pageId } = req.params;
    const { method } = req;
    if (method === 'GET') {
      const [pages, ] = await conn.query(`SELECT * FROM page WHERE id=?`, [pageId]);
      if (pages.length) {
        const page = pages[0];
        if (res.locals.setting.editor === 'engine') {
          res.render(`admin/pageEdit`, {
            pageTitle: `관리자 - ${res.locals.setting.siteName}`,
            page,
          });
        } else if (res.locals.setting.editor === 'ckeditor') {
          res.render(`admin/pageEditClassic`, {
            pageTitle: `관리자 - ${res.locals.setting.siteName}`,
            page,
          });
        }
      }
    } else if (method === 'POST') {
      const { submit } = req.body;
      if (submit === 'status') {
        const [result, ] = await conn.query(`SELECT status FROM page WHERE id=?`, [pageId]);
        const status = result[0].status;
        if (status === 1) {
          await conn.query(`UPDATE page SET status=? WHERE id=?`, [0, pageId]);
        } else {
          await conn.query(`UPDATE page SET status=? WHERE id=?`, [1, pageId]);
        }
      } else if (submit === 'delete') {
        const query = `SELECT * FROM image WHERE image_page_ID=?`;
        const [images, ] = await conn.query(query, [pageId]);
        for (let i = 0; i < images.length; i ++) {
          const key = images[i].image;
          const params = {
            Bucket: bucket,
            Key: `page/${key}`,
          };
          s3.deleteObject(params, (err, data) => {
            if (err) {
              console.error(err);
            }
          });
        }
        const [result, ] = await conn.query(`DELETE FROM page WHERE id=?`, [pageId]);
        if (result.affectedRows) {
          flash.create({
            status: true,
            message: '페이지가 삭제되었습니다',
          });
        } else {
          flash.create({
            status: false,
            message: '페이지 삭제에 실패했습니다',
          });
        }
      }
      res.redirect('/admin/page');
    }
  } finally {
    conn.release();
  }
});

exports.pageUpdate = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { pageId } = req.params;
    const { type, title, slug, html, css } = req.body;
    let { content } = req.body;
    if (title) {
      // Images
      const [oldKeys, ] = await conn.query(`SELECT * FROM image WHERE image_page_ID=?`, [pageId]);
      const imageRegex = /\/page\/([^"]+)">/ig;
      const images = Array.from(content.matchAll(imageRegex)).map(match => match[1]);
      // Delete Images
      for await (let oldkey of oldKeys) {
        const result = images.find(image => image === oldkey.key);
        if (!result) {
          const params = {
            Bucket: bucket,
            Key: `page/${oldkey.image}`,
          };
          s3.deleteObject(params, (err, data) => {
            if (err) {
              console.error(err);
            }
          });
          const thumbParams = {
            Bucket: bucket,
            Key: `page/${oldkey.image}`,
          };
          s3.deleteObject(thumbParams, (err, data) => {
            if (err) {
              console.error(err);
            }
          });
          await conn.query(`DELETE FROM image WHERE id=?`, [oldkey.id]);
        }
      }
      // Upload Images
      for await (let image of images) {
        const result = oldKeys.find(k => k.key === image);
        if (!result) {
          await conn.query(`INSERT INTO image (image_page_ID, \`key\`) VALUES (?, ?)`, [pageId, image]);
        }
      }

      // 하단 공백 제거
      content = content.replace(/((<p>&nbsp;<\/p>)*$)/, '');

      const [result, ] = await conn.query(`UPDATE page SET type=?, title=?, slug=?, content=?, html=?, css=? WHERE id=?`, [type, title, slug, content, html, css, pageId]);
      if (result.affectedRows) {
        flash.create({
          status: true,
          message: '페이지를 수정했습니다',
        });
      } else {
        flash.create({
          status: false,
          message: '페이지 수정에 실패했습니다',
        });
      }
      res.redirect('/admin/page');
    } else {
      res.redirect(req.headers.referer);
    }
  } finally {
    conn.release();
  }
});

exports.banner = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    if (method === 'GET') {
      const bannerClass = new Banner(req, res, conn);
      const headerCount = await bannerClass.getCount('header');
      const indexTopCount = await bannerClass.getCount('indexTop');
      const indexBottomCount = await bannerClass.getCount('indexBottom');
      const sideTopCount = await bannerClass.getCount('sideTop');
      const sideBottomCount = await bannerClass.getCount('sideBottom');
      const articleTopCount = await bannerClass.getCount('articleTop');
      const articleBottomCount = await bannerClass.getCount('articleBottom');
      const leftWingCount = await bannerClass.getCount('leftWing');
      const rightWingCount = await bannerClass.getCount('rightWing');
      const customCount = await bannerClass.getCount('custom');
      res.render('admin/banner', {
        pageTitle: `배너 - ${res.locals.setting.siteName}`,
        headerCount,
        indexTopCount,
        indexBottomCount,
        sideTopCount,
        sideBottomCount,
        articleTopCount,
        articleBottomCount,
        leftWingCount,
        rightWingCount,
        customCount,
      });
    } else if (method === 'POST') {
      const { position, align } = req.body;
      const data = {
        align,
      };
      const settingClass = new Setting(req, res, conn);
      if (position === 'header') {
        await settingClass.update({ bannerAlignHeader: align });
      } else if (position === 'indexTop') {
        await settingClass.update({ bannerAlignIndexTop: align });
      } else if (position === 'indexBottom') {
        await settingClass.update({ bannerAlignIndexBottom: align });
      } else if (position === 'sideTop') {
        await settingClass.update({ bannerAlignSideTop: align });
      } else if (position === 'sideBottom') {
        await settingClass.update({ bannerAlignSideBottom: align });
      } else if (position === 'articleTop') {
        await settingClass.update({ bannerAlignArticleTop: align });
      } else if (position === 'articleBottom') {
        await settingClass.update({ bannerAlignArticleBottom: align });
      } else if (position === 'leftWing') {
        await settingClass.update({ bannerAlignLeftWing: align });
      } else if (position === 'rightWing') {
        await settingClass.update({ bannerAlignRightWing: align });
      } else if (position === 'custom') {
        await settingClass.update({ bannerAlignCustom: align });
      }
      res.redirect(req.headers.referer);
    }
  } finally {
    conn.release();
  }
});

exports.bannerDetail = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { position } = req.params;
    const bannerClass = new Banner(req, res, conn);
    const banners = await bannerClass.getBanners(position);
    res.render('admin/bannerDetail', {
      pageTitle: `배너 - ${res.locals.setting.siteName}`,
      banners,
      position,
    });
  } finally {
    conn.release();
  }
});

exports.bannerNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { position, link, viewOrder } = req.body;
    const newPage = req.body.newPage || 0;
    if (req.files.image) {
      const image = req.files.image[0];
      const key = await imageUpload(image, 'banner');
      const query = `INSERT INTO banner
      (position, image, link, viewOrder, newPage)
      VALUES (?, ?, ?, ?, ?)`;
      const [result, ] = await conn.query(query, [position, key, link, viewOrder, newPage]);
      if (result.insertId) {
        flash.create({
          status: true,
          message: '배너 등록에 성공하였습니다',
        });
      } else {
        flash.create({
          status: false,
          message: '배너 등록에 실패하였습니다',
        });
      }
    } else {
      flash.create({
        status: false,
        message: '배너 이미지를 등록해주세요',
      });
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.bannerEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { bannerId } = req.params;
    const { submit } = req.body;
    if (submit === 'hide') {
      const [banners, ] = await conn.query(`SELECT * FROM banner WHERE id=?`, [bannerId]);
      if (banners.length) {
        const banner = banners[0];
        if (banner.status === 1) {
          await conn.query(`UPDATE banner SET status=? WHERE id=?`,[0, bannerId]);
        } else if (banner.status === 0) {
          await conn.query(`UPDATE banner SET status=? WHERE id=?`,[1, bannerId]);
        }
        res.redirect(req.headers.referer);
      }
    } else if (submit === 'edit') {
      const { position, link, viewOrder } = req.body;

      if (req.files.image) {
        const image = req.files.image[0];
        // Delete Old banner
        const banner = res.locals.banners.find(b => b.id === Number(bannerId));
        const oldKey = banner.image;
        const params = {
          Bucket: bucket,
          Key: `banner/${oldKey}`,
        };
        s3.deleteObject(params, async (err, data) => {
          if (err) {
            console.error(err);
          }
        });
        // New Image
        const key = await imageUpload(image, 'banner');
        await conn.query(`UPDATE banner SET image=? WHERE id=?`, [key, bannerId]);
      }

      const newPage = req.body.newPage || 0;
      const desktopHide = req.body.desktopHide || 0;
      const mobileHide = req.body.mobileHide || 0;
      await conn.query(`UPDATE banner SET position=?, link=?, viewOrder=?, newPage=?, desktopHide=?, mobileHide=? WHERE id=?`, [position, link, viewOrder, newPage, desktopHide, mobileHide, bannerId]);
      res.redirect(req.headers.referer);
    } else if (submit === 'delete') {
      const [result, ] = await conn.query(`SELECT * FROM banner WHERE id=?`, [bannerId]);
      const key = result[0].image;
      const params = {
        Bucket: bucket,
        Key: `banner/${key}`,
      };
      s3.deleteObject(params, async (err, data) => {
        if (err) {
          console.error(err);
        } else {
          await conn.query(`DELETE FROM banner WHERE id=?`, [bannerId]);
          res.redirect(req.headers.referer);
        }
      });
    }
  } finally {
    conn.release();
  }
});

// Message
exports.totalMessage = doAsync(async (req, res, next) => {
  res.render('admin/totalMessage', {
    pageTitle: `전체 메시지 - ${res.locals.setting.siteName}`,
  });
});

exports.sendMessage = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { content } = req.body;
    const user = res.locals.user;
    const query = `SELECT *
    FROM user
    WHERE id != ?`;
    const [targetUsers, ] = await conn.query(query, [user.id]);
    for (let targetUser of targetUsers) {
      const messageQuery = `INSERT INTO
      message
      (message_sender_ID, message_recipient_ID, content)
      VALUES (?, ?, ?)`;
      const [result, ] = await conn.query(messageQuery, [user.id, targetUser.id, content]);
      await conn.query(`INSERT INTO alarm (type, alarm_user_ID, alarm_relatedUser_ID, alarm_message_ID) VALUES (?, ?, ?, ?)`, ['message', targetUser.id, user.id, result.insertId]);
    }
    flash.create({
      status: true,
      message: '전체 메시지 발송 완료',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.sendEmail = doAsync(async (req, res, next) => {
  res.redirect(req.headers.referer);
});

exports.indexBoardGroup = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [adminIndexBoardGroups, ] = await conn.query(`SELECT * FROM indexBoardGroup ORDER BY viewOrder ASC, id ASC`);
    const boards = res.locals.boards;
    res.render('admin/indexBoardGroup', {
      pageTitle: `첫페이지 - ${res.locals.setting.siteName}`,
      adminIndexBoardGroups,
      boards,
    });
  } finally {
    conn.release();
  }
});

exports.indexBoardGroupNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { title, type } = req.body;
    await conn.query(`INSERT INTO indexBoardGroup (title, type) VALUES (?, ?)`, [title, type]);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.indexBoardGroupEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { indexBoardGroupId } = req.params;
    const { submit } = req.body;
    const indexBoardGroupClass = new IndexBoardGroup(req, res, conn);
    if (submit === 'status') {
      const indexBoardGroup = await indexBoardGroupClass.get(indexBoardGroupId);
      if (indexBoardGroup.status) {
        const data = {
          status: 0,
        };
        await indexBoardGroupClass.update(indexBoardGroupId, data);
      } else {
        const data = {
          status: 1,
        };
        await indexBoardGroupClass.update(indexBoardGroupId, data);
      }
    } else if (submit === 'edit') {
      const { title, content, type, viewOrder } = req.body;
      const showTitleAndContent = req.body.showTitleAndContent || 0;
      await conn.query(`UPDATE indexBoardGroup SET title=?, content=?, showTitleAndContent=?, type=?, viewOrder=? WHERE id=?`, [title, content, showTitleAndContent, type, viewOrder, indexBoardGroupId]);
    } else if (submit === 'delete') {
      const [indexBoards, ] = await conn.query(`SELECT * FROM indexBoardIndexBoardGroup WHERE indexBoardIndexBoardGroup_indexBoardGroup_ID=?`, [indexBoardGroupId]);
      await conn.query(`DELETE FROM indexBoardGroup WHERE id=?`, [indexBoardGroupId]);
      for await (let indexBoard of indexBoards) {
        await conn.query(`DELETE FROM indexBoard WHERE id=?`, [indexBoard.indexBoardIndexBoardGroup_indexBoard_ID]);
      }
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.indexBoardGroupDetail = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { indexBoardGroupId } = req.params;
    const [indexBoardGroups, ] = await conn.query(`SELECT * FROM indexBoardGroup WHERE id=?`, [indexBoardGroupId]);
    if (indexBoardGroups.length) {
      const indexBoardGroup = indexBoardGroups[0];
      const query = `SELECT ib.*
      FROM indexBoard AS ib
      LEFT JOIN indexBoardIndexBoardGroup AS ibig
      ON ib.id = ibig.indexBoardIndexBoardGroup_indexBoard_ID
      LEFT JOIN indexBoardGroup AS ig
      ON ibig.indexBoardIndexBoardGroup_indexBoardGroup_ID = ig.id
      WHERE ig.id=?
      ORDER BY ib.viewOrder ASC, ib.id ASC`;
      const [indexBoards, ] = await conn.query(query, [indexBoardGroupId]);
      res.render('admin/indexBoardGroupDetail', {
        pageTitle: '첫페이지 상세설정',
        indexBoards,
        indexBoardGroup,
      });
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});


exports.indexBoardNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { indexBoardGroup, board, type, articleOrder } = req.body;
    const [result, ] = await conn.query(`INSERT INTO indexBoard (indexBoard_board_ID, type, articleOrder) VALUES (?, ?, ?)`, [board, type, articleOrder]);
    if (result.insertId) {
      await conn.query(`INSERT INTO indexBoardIndexBoardGroup (indexBoardIndexBoardGroup_indexBoard_ID, indexBoardIndexBoardGroup_indexBoardGroup_ID) VALUES (?, ?)`, [result.insertId, indexBoardGroup]);
    } else {
      
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.indexBoardEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { indexBoardId } = req.params;
    const { submit } = req.body;
    if (submit === 'edit') {
      const { board, type, articleOrder, exceptBoards, viewCount, viewOrder } = req.body;
      await conn.query(`UPDATE indexBoard SET indexBoard_board_ID=?, type=?, articleOrder=?, exceptBoards=?, viewCount=?, viewOrder=? WHERE id=?`, [board, type, articleOrder, exceptBoards, viewCount, viewOrder, indexBoardId]);
    } else if (submit === 'delete') {
      await conn.query(`DELETE FROM indexBoard WHERE id=?`, [indexBoardId]);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.permission = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    if (method === 'GET') {
      const permissionClass = new Permission(req, res, conn);
      const permissions = await permissionClass.getPermissions();
      res.render('admin/permission', {
        pageTitle: '회원등급',
        permissions,
      });
    } else if (method === 'POST') {
      const { useAutoPermission } = req.body;
      const data = {
        useAutoPermission,
      };
      const settingClass = new Setting(req, res, conn);
      await settingClass.update(data);
      flash.create({
        status: true,
        message: '설정값 수정에 성공하였습니다',
      });
      res.redirect(req.headers.referer);
    }
  } finally {
    conn.release();
  }
});

exports.permissionNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { permission, title } = req.body;
    const permissionClass = new Permission(req, res, conn);
    const data = {
      permission,
      title,
    };
    await permissionClass.create(data);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.permissionEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { permissionId } = req.params;
    const { submit } = req.body;
    const permissionClass = new Permission(req, res, conn);
    if (submit === 'edit') {
      const { title, pointBaseline } = req.body;
      const isAdmin = req.body.isAdmin || 0;
      const { image } = req.files;
      
      if (image?.length) {
        // Delete Image
        const [result, ] = await conn.query(`SELECT * FROM permission WHERE id=?`, [permissionId]);
        const oldKey = result[0].image;
        if (oldKey) {
          const params = {
            Bucket: bucket,
            Key: `permission/${oldKey}`,
          };
          s3.deleteObject(params, async (err, data) => {
            if (err) {
              console.error(err);
            }
          });
        }

        const key = await imageUpload(image[0], 'permission');
        const query = `UPDATE permission SET image=? WHERE id=?`;
        await conn.query(query, [key, permissionId]);
      }
      const query = `UPDATE permission
      SET title=?, pointBaseline=?, isAdmin=?
      WHERE id=?`;
      await conn.query(query, [title, pointBaseline, isAdmin, permissionId]);
    } else if (submit === 'delete') {
      await permissionClass.remove(permissionId);
    } else if (submit === 'resetImage') {
      // Delete Image
      const [result, ] = await conn.query(`SELECT * FROM permission WHERE id=?`, [permissionId]);
      const key = result[0].image;
      if (key) {
        const params = {
          Bucket: bucket,
          Key: `permission/${key}`,
        };
        s3.deleteObject(params, async (err, data) => {
          if (err) {
            console.error(err);
          }
        });
      }
      await conn.query(`UPDATE permission SET image=? WHERE id=?`, [null, permissionId]);
    }
    res.redirect('/admin/permission');
  } finally {
    conn.release();
  }
});

exports.assets = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { page } = req.query;
    const pnQuery = `SELECT count(*) AS count FROM assets WHERE type='image'`;
    const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
    const [assets, ] = await conn.query(`SELECT * FROM assets WHERE type='image' ORDER BY id DESC ${pn.queryLimit}`);
    res.render('admin/assets', {
      pageTitle: '에셋',
      assets,
      pn,
      page,
    });
  } finally {
    conn.release();
  }
});

exports.assetsNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { type } = req.body;
    const images = req.files.images;
    if (images?.length) {
      images.sort((a, b) => a.originalname.toLowerCase() < b.originalname.toLowerCase() ? -1 : 1);
      for (let image of images) {
        const key = await imageUpload(image, 'assets');
        await conn.query(`INSERT INTO assets (type, image) VALUES (?, ?)`, [type, key]);
      }
      flash.create({
        status: true,
        message: '에셋 등록에 성공하였습니다',
      });
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.assetsEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { assetId } = req.params;
    const [imageResult, ] = await conn.query(`SELECT * FROM assets WHERE id=?`, [assetId]);
    if (imageResult.length) {
      const key = imageResult[0].image;
      const params = {
        Bucket: bucket,
        Key: `assets/${key}`,
      };
      s3.deleteObject(params, async (err, data) => {
        if (err) {
          console.error(err);
        }
      });
      await conn.query(`DELETE FROM assets WHERE id=?`, [assetId]);
    }
    res.redirect('/admin/assets');
  } finally {
    conn.release();
  }
});

exports.go = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const goClass = new Go(req, res, conn);
    const { gos, pn } = await goClass.getGosByPagination();
    res.render('admin/go', {
      pageTitle: 'GO',
      gos,
      pn,
    });
  } finally {
    conn.release();
  }
});

exports.goNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { slug, url } = req.body;
    const goClass = new Go(req, res, conn);
    const data = {
      slug,
      url,
    };
    await goClass.create(data);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.goEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { goId } = req.params;
    const { submit } = req.body;
    const goClass = new Go(req, res, conn);
    if (submit === 'edit') {
      const { slug, url } = req.body;
      const data = {
        slug,
        url,
      };
      await goClass.update(goId, data);
    } else if (submit === 'delete') {
      goClass.remove(goId);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.check = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    if (method === 'GET') {
      const [checkContinues, ] = await conn.query(`SELECT * FROM checkContinue ORDER BY date ASC, id ASC`);
      res.render('admin/check', {
        pageTitle: `출석체크 - ${res.locals.setting.siteName}`,
        checkContinues,
      });
    } else if (method === 'POST') {
      const { checkPoint, useCheckComments, checkComments } = req.body;
      const data = {
        checkPoint,
        useCheckComments,
        checkComments,
      };
      const settingClass = new Setting(req, res, conn);
      await settingClass.update(data);
      res.redirect(req.headers.referer);
    }
  } finally {
    conn.release();
  }
});

exports.checkNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { date, point } = req.body;
    await conn.query(`INSERT INTO checkContinue (date, point) VALUES (?, ?)`, [date, point]);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.checkEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { checkContinueId } = req.params;
    const { date, point } = req.body;
    const { submit } = req.body;
    if (submit === 'edit') {
      await conn.query(`UPDATE checkContinue SET date=?, point=? WHERE id=?`, [date, point, checkContinueId]);
    } else if (submit === 'delete') {
      await conn.query(`DELETE FROM checkContinue WHERE id=?`, [checkContinueId]);
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

// Parsing
exports.parsing = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [sites, ] = await conn.query(`SELECT * FROM parsingSite ORDER BY id DESC`);
    res.render('admin/parsing', {
      pageTitle: `파싱 - ${res.locals.setting.siteName}`,
      sites,
    });
  } finally {
    conn.release();
  }
});

exports.parsingSiteNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { title, url } = req.body;
    await conn.query(`INSERT INTO parsingSite (title, url) VALUES (?, ?)`, [title, url]);
    res.redirect('/admin/parsing');
  } finally {
    conn.release();
  }
});

exports.parsingSiteEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { siteId } = req.params;
    const { submit } = req.body;
    if (submit === 'edit') {
      const { title, url } = req.body;
      await conn.query(`UPDATE parsingSite SET title=?, url=? WHERE id=?`, [title, url, siteId]);
    } else if (submit === 'delete') {
      await conn.query(`DELETE FROM parsingSite WHERE id=?`, [siteId]);
    }
    res.redirect('/admin/parsing');
  } finally {
    conn.release();
  }
});

exports.parsingSiteDetailEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { siteId } = req.params;
    const { urlStructure, articleIdRegex, listSelector, listRegex, delay, titleSelector, titleRegex, contentSelector, contentRegex } = req.body;
    const query = `UPDATE parsingSite SET urlStructure=?, articleIdRegex=?, listSelector=?, listRegex=?, delay=?, titleSelector=?, titleRegex=?, contentSelector=?, contentRegex=? WHERE id=?`;
    await conn.query(query, [urlStructure, articleIdRegex, listSelector, listRegex, delay, titleSelector, titleRegex, contentSelector, contentRegex, siteId]);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.parsingBoard = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { boardId } = req.params;
    const [parsingSites, ] = await conn.query(`SELECT * FROM parsingSite WHERE id=?`, [boardId]);
    const parsingSite = parsingSites[0];
    const [parsingBoards, ] = await conn.query(`SELECT * FROM parsingBoard WHERE parsingBoard_parsingSite_ID=? ORDER BY id DESC`, [boardId]);
    const [targetBoards, ] = await conn.query(`SELECT * FROM board ORDER BY id DESC`);
    res.render('admin/parsingBoard', {
      pageTitle: ` - 파싱 - ${res.locals.setting.siteName}`,
      parsingSite,
      parsingBoards,
      targetBoards,
    });
  } finally {
    conn.release();
  }
});

exports.parsingBoardNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { siteId, title, slug, targetBoard } = req.body;
    await conn.query(`INSERT INTO parsingBoard (parsingBoard_parsingSite_ID, parsingBoard_targetBoard_ID, title, slug) VALUES (?, ?, ?, ?)`, [siteId, targetBoard, title, slug]);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.parsingBoardEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { boardId } = req.params;
    const { submit } = req.body;
    if (submit === 'edit') {
      const { title, slug, listSelector, titleSelector, contentSelector, targetBoard } = req.body;
      await conn.query(`UPDATE parsingBoard SET parsingBoard_targetBoard_ID=?, title=?, slug=?, listSelector=?, titleSelector=?, contentSelector=? WHERE id=?`, [targetBoard, title, slug, listSelector, titleSelector, contentSelector, boardId]);
    } else if (submit === 'delete') {
      await conn.query(`DELETE FROM parsingBoard WHERE id=?`, [boardId]);
    } else if (submit === 'get') {
      const { startPage, lastPage } = req.body;
      // 가져오기
      const [boards, ] = await conn.query(`SELECT * FROM parsingBoard WHERE id=?`, [boardId]);
      const board = boards[0];
      const [sites, ] = await conn.query(`SELECT * FROM parsingSite WHERE id=?`, [board.parsingBoard_parsingSite_ID]);
      const site = sites[0];
      const parsing = new Parsing(res.locals.user, site, board, startPage, lastPage);
      parsing.start();
      // parsing.uploadArticles();
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.parsingArticle = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { page } = req.query;
    const pnQuery = `SELECT count(*) AS count FROM parsingArticle`;
    const pn = await pagination(pnQuery, req.query, 'page', 10, 5);
    const { boardId } = req.params;
    const query = `SELECT *
    FROM parsingArticle
    WHERE parsingArticle_parsingBoard_ID=?
    ORDER BY createdAt DESC
    ${pn.queryLimit}`;
    const [articles, ] = await conn.query(query, [boardId]);
    const [parsingBoards, ] = await conn.query(`SELECT * FROM parsingBoard WHERE id=?`, [boardId]);
    const parsingBoard = parsingBoards[0];
    articles.forEach(a => {
      a.datetime = datetime(a.createdAt);
    });
    res.render('admin/parsingArticle', {
      pageTitle: `게시글 보기 - ${res.locals.setting.siteName}`,
      articles,
      parsingBoard,
      pn,
    });
  } finally {
    conn.release();
  }
});

exports.parsingArticleEdit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { articleId } = req.params;
    await conn.query(`DELETE FROM parsingArticle WHERE id=?`, [articleId]);
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

// Setting
exports.setting = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const settingClass = new Setting(req, res, conn);
    const setting = await settingClass.get();
    res.render('admin/setting', {
      pageTitle: `설정 - ${res.locals.setting.siteName}`,
      setting,
    });
  } finally {
    conn.release();
  }
});

exports.settingBasic = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { siteNameRaw, siteName, siteDomain, siteDescription } = req.body;
    const data = {
      siteNameRaw,
      siteName,
      siteDomain,
      siteDescription,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingFooter = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { footerGuide } = req.body;
    const data = {
      footerGuide,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingEmail = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { emailService, emailUser, emailPassword } = req.body;
    const data = {
      emailService,
      emailUser,
      emailPassword,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingDesign = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [settings, ] = await conn.query(`SELECT * FROM setting ORDER BY id DESC LIMIT 1`);
    if (settings.length) {
      const setting = settings[0];
      if (req.files.logo) {
        // Delete Old Logo Image
        if (setting.logoImage) {
          const oldKey = setting.logoImage;
          const params = {
            Bucket: bucket,
            Key: `assets/${oldKey}`,
          };
          s3.deleteObject(params, (err, data) => {
            if (err) {
              console.error(err);
            }
          });
        }
        // New Logo Image
        const logo = req.files.logo[0] || null;
        const key = await imageUpload(logo, 'assets');
        await conn.query(`UPDATE setting SET logoImage=? WHERE id=?`, [key, setting.id]);
      }

      // Favicon
      if (req.files.favicon) {
        // Delete Old Favicon Image
        if (setting.faviconImage) {
          const oldKey = setting.faviconImage;
          const params = {
            Bucket: bucket,
            Key: `assets/${oldKey}`,
          };
          s3.deleteObject(params, (err, data) => {
            if (err) {
              console.error(err);
            }
          });
        }
        // New Favicon Image
        const faviconImage = req.files.favicon[0] || null;
        const result = await favicon(faviconImage);
        if (result.status) {
          await conn.query(`UPDATE setting SET faviconImage=? WHERE id=?`, [result.key, setting.id]);
        } else {
          flash.create({
            status: false,
            message: '파비콘은 500x500 이상의 정사이즈 PNG 이미지로 등록해주세요',
          });
        }
      }
      const { logoType, logoImageSize } = req.body;
      const query = `UPDATE setting SET logoType=?, logoImageSize=? WHERE id=?`;
      const [result, ] = await conn.query(query, [logoType, logoImageSize, setting.id]);
      if (result.affectedRows) {
        if (!flash.basket.message) {
          flash.create({
            status: true,
            message: '설정값 수정에 성공하였습니다',
          });
        }
      } else {
        flash.create({
          status: false,
          message: '설정값 수정에 실패하였습니다',
        });
      }
      res.redirect('/admin/setting');
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.settingLayout = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { font, theme, headerLayout, footerLayout, indexLayout, boardTheme } = req.body;
    const data = {
      font,
      theme,
      headerLayout,
      footerLayout,
      indexLayout,
      boardTheme,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingEtcDesign = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { headerFontColor, headerBackgroundColor, bodyFontColor, bodyBackgroundColor, pointColor, pointBackgroundColor } = req.body;
    const data = {
      headerFontColor,
      headerBackgroundColor,
      bodyFontColor,
      bodyBackgroundColor,
      pointColor,
      pointBackgroundColor,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingBanner = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { desktopBannerRowsHeader, desktopBannerRowsIndexTop, desktopBannerRowsIndexBottom, desktopBannerRowsSideTop, desktopBannerRowsSideBottom, desktopBannerRowsArticleTop, desktopBannerRowsArticleBottom, desktopBannerRowsCustom, mobileBannerRowsHeader, mobileBannerRowsIndexTop, mobileBannerRowsIndexBottom, mobileBannerRowsSideTop, mobileBannerRowsSideBottom, mobileBannerRowsArticleTop, mobileBannerRowsArticleBottom, mobileBannerRowsCustom, bannerGapDesktop, bannerGapMobile } = req.body;
    const bannerBorderRounding = req.body.bannerBorderRounding || 0;
    const data = {
      desktopBannerRowsHeader,
      desktopBannerRowsIndexTop,
      desktopBannerRowsIndexBottom,
      desktopBannerRowsSideTop,
      desktopBannerRowsSideBottom,
      desktopBannerRowsArticleTop,
      desktopBannerRowsArticleBottom,
      desktopBannerRowsCustom,
      mobileBannerRowsHeader,
      mobileBannerRowsIndexTop,
      mobileBannerRowsIndexBottom,
      mobileBannerRowsSideTop,
      mobileBannerRowsSideBottom,
      mobileBannerRowsArticleTop,
      mobileBannerRowsArticleBottom,
      mobileBannerRowsCustom,
      bannerGapDesktop,
      bannerGapMobile,
      bannerBorderRounding,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingBoard = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { writingTerm } = req.body;
    const boardPrevNextArticle = req.body.boardPrevNextArticle || 0;
    const boardAllArticle = req.body.boardAllArticle || 0;
    const boardAuthorArticle = req.body.boardAuthorArticle || 0;
    const data = {
      boardPrevNextArticle,
      boardAllArticle,
      boardAuthorArticle,
      writingTerm,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingSeo = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { customHeadTags, customHeaderTags, customFooterTags, metaTagKeyword } = req.body;
    const data = {
      customHeadTags,
      customHeaderTags,
      customFooterTags,
      metaTagKeyword,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingAdsense = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { adsenseAds, adsenseSide, adsenseTop, adsenseBottom, adsenseCustom } = req.body;
    const data = {
      adsenseAds,
      adsenseSide,
      adsenseTop,
      adsenseBottom,
      adsenseCustom,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingBlockWords = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { blockWords } = req.body;
    const data = {
      blockWords,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingJoinForm = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { useJoinPhone, useJoinRealName } = req.body;
    const data = {
      useJoinPhone,
      useJoinRealName,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingSocial = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const useSocialApple = req.body.useSocialApple || 0;
    const useSocialGoogle = req.body.useSocialGoogle || 0;
    const useSocialFacebook = req.body.useSocialFacebook || 0;
    const useSocialTwitter = req.body.useSocialTwitter || 0;
    const useSocialNaver = req.body.useSocialNaver || 0;
    const useSocialKakao = req.body.useSocialKakao || 0;
    const { socialAppleServiceId, socialAppleTeamId, socialAppleKeyId, socialAppleAuthKey, socialGoogleClientId, socialGoogleClientSecret, socialFacebookAppId, socialFacebookAppSecret, socialTwitterApiKey, socialTwitterApiSecret, socialNaverClientId, socialNaverClientSecret, socialKakaoClientId, socialKakaoClientSecret } = req.body;
    const data = {
      useSocialApple,
      useSocialGoogle,
      useSocialFacebook,
      useSocialTwitter,
      useSocialNaver,
      useSocialKakao,
      socialAppleServiceId,
      socialAppleTeamId,
      socialAppleKeyId,
      socialAppleAuthKey,
      socialGoogleClientId,
      socialGoogleClientSecret,
      socialFacebookAppId,
      socialFacebookAppSecret,
      socialTwitterApiKey,
      socialTwitterApiSecret,
      socialNaverClientId,
      socialNaverClientSecret,
      socialKakaoClientId,
      socialKakaoClientSecret,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingSms = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { smsCallerId, smsServiceId, smsServiceSecretKey } = req.body;
    const data = {
      smsCallerId,
      smsServiceId,
      smsServiceSecretKey,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingApi = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { telegramToken, telegramChatId, naverCloudPlatformAccessKeyId, naverCloudPlatformSecretKey, googleCloudPlatformApiKey } = req.body;
    const data = {
      telegramToken,
      telegramChatId,
      naverCloudPlatformAccessKeyId,
      naverCloudPlatformSecretKey,
      googleCloudPlatformApiKey,
    };
    const settingClass = new Setting(req, res, conn);
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.settingEtc = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { pointWithdrawLimit, invitePoint } = req.body;
    const useTermsAndPrivacy = req.body.useTermsAndPrivacy || 0;
    const useEmailAuthentication = req.body.useEmailAuthentication || 0;
    const useSmsAuthentication = req.body.useSmsAuthentication || 0;
    const useArticleViewCount = req.body.useArticleViewCount || 0;
    const useVisitCount = req.body.useVisitCount || 0;
    const useMessage = req.body.useMessage || 0;
    const useChat = req.body.useChat || 0;
    const useSms = req.body.useSms || 0;
    const usePermissionImage = req.body.usePermissionImage || 0;
    const useWithdraw = req.body.useWithdraw || 0;
    const useWorkingUser = req.body.useWorkingUser || 0;
    const usePointWithdraw = req.body.usePointWithdraw || 0;
    const settingClass = new Setting(req, res, conn);
    const data = {
      pointWithdrawLimit,
      invitePoint,
      useTermsAndPrivacy,
      useEmailAuthentication,
      useSmsAuthentication,
      useArticleViewCount,
      useVisitCount,
      useMessage,
      useChat,
      useSms,
      usePermissionImage,
      useWithdraw,
      useWorkingUser,
      usePointWithdraw,
    };
    await settingClass.update(data);
    flash.create({
      status: true,
      message: '설정값 수정에 성공하였습니다',
    });
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});

exports.hidden = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    const settingClass = new Setting(req, res, conn);
    if (method === 'GET') {
      const setting = await settingClass.get();
      res.render('admin/hidden', {
        pageTitle: `히든설정 - ${res.locals.setting.siteName}`,
        setting,
      });
    } else if (method === 'POST') {
      const { index, headerLayout, footerLayout, indexLayout, landingLayout } = req.body;
      const useCustomLayout = req.body.useCustomLayout || 0;
      const data = {
        index,
        useCustomLayout,
        headerLayout,
        footerLayout,
        indexLayout,
        landingLayout,
      };
      const settingClass = new Setting(req, res, conn);
      await settingClass.update(data);
      flash.create({
        status: true,
        message: '설정값 수정에 성공하였습니다',
      });
      res.redirect(req.headers.referer);
    }
  } finally {
    conn.release();
  }
});