const pool = require('../middleware/database');
const flash = require('../middleware/flash');
const { addLog } = require('../middleware/addlog');
const datetime = require('../middleware/datetime');
const doAsync = require('../middleware/doAsync');
const Board = require('../services/board');
const Article = require('../services/article');
const Comment = require('../services/comment');
const Point = require('../services/point');
const User = require('../services/user');
const Alarm = require('../services/alarm');
const UserGroupBoard = require('../services/userGroupBoard');
const UserBlockUser = require('../services/userBlockUser');
const pushmessage = require('../middleware/pushnotification');

exports.all = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { searchType, keyword, page } = req.query;
    const articleClass = new Article(req, res, conn);
    const { articles, pn } = await articleClass.getArticles();
    res.render('layout', {
      type: `all`,
      pageTitle: `전체게시글 - ${res.locals.setting.siteName}`,
      articles,
      page,
      searchType,
      keyword,
      pn,
      searchUrl: 'all',
    });
  } finally {
    conn.release();
  }
});

exports.best = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { searchType, keyword, page } = req.query;
    const articleClass = new Article(req, res, conn);
    const data = {
      type: 'best',
    };
    const { articles, pn } = await articleClass.getArticles(data);
    res.render('layout', {
      type: `best`,
      pageTitle: `인기게시글 - ${res.locals.setting.siteName}`,
      title: '인기게시글',
      articles,
      page,
      searchType,
      keyword,
      pn,
      searchUrl: 'best',
    });
  } finally {
    conn.release();
  }
});

exports.bestTerm = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { searchType, keyword, page } = req.query;
    const { term } = req.params;
    if (term === 'day' || term === 'week' || term === 'month') {
      let type = null;
      let pageTitle = null;
      let title = null;
      if (term === 'day') {
        type = 'bestDay';
        pageTitle = `일간 인기게시글 - ${res.locals.setting.siteName}`;
        title = `일간 인기게시글`;
      } else if (term === 'week') {
        type = 'bestWeek';
        pageTitle = `주간 인기게시글 - ${res.locals.setting.siteName}`;
        title = `주간 인기게시글`;
      } else if (term === 'month') {
        type = 'bestMonth';
        pageTitle = `월간 인기게시글 - ${res.locals.setting.siteName}`;
        title = `월간 인기게시글`;
      }
      const articleClass = new Article(req, res, conn);
      const data = {
        type,
      };
      const { articles, pn } = await articleClass.getArticles(data);
      res.render('layout', {
        type,
        pageTitle,
        title,
        articles,
        page,
        searchType,
        keyword,
        pn,
        searchUrl: `best/${term}`,
      });
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.search = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { searchType, keyword, page } = req.query;
    const articleClass = new Article(req, res, conn);
    const { articles, pn } = await articleClass.getArticles();
    res.render('layout', {
      type: `search`,
      pageTitle: `${keyword} - 검색결과 - ${res.locals.setting.siteName}`,
      articles,
      page,
      searchType,
      keyword,
      pn,
      searchUrl: 'search',
    });
  } finally {
    conn.release();
  }
});

exports.page = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { page } = req.params;
    const [pages, ] = await conn.query(`SELECT * FROM page WHERE slug=? AND status=1`, [page]);
    if (pages.length) {
      const page = pages[0];
      addLog(req, `${page.title}`);
      if (page.type === 'editor') {
        res.render('layout', {
          type: 'page',
          pageTitle: `${page.title} - ${res.locals.setting.siteName}`,
          page,
        });
      } else if (page.type === 'source') {
        res.render('layout', {
          type: 'page',
          pageTitle: `${page.title} - ${res.locals.setting.siteName}`,
          page,
        });
      }
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.menuAll = doAsync(async (req, res, next) => {
  const { menuSlug } = req.params;
  const menus = res.locals.menus;
  const menu = menus.find(m => m.slug === menuSlug);
  if (menu) {
    const conn = await pool.getConnection();
    try {
      const subMenus = res.locals.menus.filter(m => m.parentId === menu.id); // TODO: 수정
      let boards = [];
      for await (let subMenu of subMenus) {
        const [boardResult, ] = await conn.query(`SELECT * FROM board WHERE slug=?`, [subMenu.target]);
        if (boardResult.length) {
          const board = boardResult[0];
          const query = `SELECT a.*, b.title AS boardTitle, b.slug AS boardSlug, b.color AS boardColor, c.title AS category, c.color AS categoryColor, u.nickName AS nickName
          FROM article AS a
          LEFT JOIN board AS b
          ON a.article_board_ID = b.id
          LEFT JOIN category AS c
          ON a.article_category_ID = c.id
          LEFT JOIN user AS u
          ON a.article_user_ID = u.id
          WHERE a.status = 1 AND a.article_board_ID = ?
          ORDER BY a.createdAt DESC
          LIMIT 5`;
          const [articles, ] = await conn.query(query, [board.id]);
          articles.forEach(a => {
            a.datetime = datetime(a.createdAt);
          });
          board.articles = articles;
          boards.push(board);
        }
      }
      res.render('layout', {
        type: 'menuAll',
        pageTitle: `${menu.title} - ${res.locals.setting.siteName}`,
        boards,
        menu,
      });
    } finally {
      conn.release();
    }
  } else {
    next();
  }
});

exports.list = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { searchType, keyword, category, page } = req.query;
    const { boardSlug } = req.params;
    const user = res.locals.user;
    const boardClass = new Board(req, res, conn);
    const board = await boardClass.get(boardSlug, { categories: true });
    const userGroupBoardClass = new UserGroupBoard(req, res, conn);
    const userGroupListPermission = await userGroupBoardClass.check(board?.id, 'listPermission');
    if (board) {
      if ((user?.permission >= board.listPermission || board.listPermission === 0) && (board.useUserGroupPermission && userGroupListPermission || !board.useUserGroupPermission) || user?.isAdmin) {
        const writePermission = user?.permission >= board.writePermission || board.writePermission === 0;
        const articleClass = new Article(req, res, conn);
        const data = {
          board,
        };
        const { articles, pn } = await articleClass.getArticles(data);
        // Notice
        let notices = [];
        const noticeData = {
          board,
          notice: true,
        };
        if (!searchType && (page === undefined || Number(page) === 1)) {
          const noticeResult = await articleClass.getArticles(noticeData);
          notices = noticeResult.articles;
        }
        // addLog(req, `${board.title}`);
        // 한번만 사용 시
        let pullUp = false;
        if (board.useOnce) {
          const [onceCheckResult, ] = await conn.query(`SELECT * FROM article WHERE article_board_ID=? AND article_user_ID=? AND status=?`, [board?.id, user?.id, 2]);
          if (onceCheckResult.length) pullUp = true;
        }

        //실제 닉네임 사용시
        articles.forEach(async article => {
          if(article.nametag == 1){
            const requestUser = await conn.query('SELECT * FROM user WHERE id=?', [article.article_user_ID]);
            console.log(requestUser);
            article.nickName = requestUser?.nickName;
          }
        })

        // Block Users
        const userBlockUserClass = new UserBlockUser(req, res, conn);
        const blockUsers = await userBlockUserClass.getUsers(user?.id);
        articles.forEach(article => {
          const match = blockUsers.find(blockUser => blockUser.userBlockUser_targetUser_ID === article.article_user_ID);
          if (match) {
            article.block = true;
            article.title = `차단된 사용자의 글입니다`;
            article.nickName = '차단된 사용자';
            article.permissionName = null;
            article.permissionImage = null;
          }
        });

        const boardBanners = res.locals.banners.filter(banner => banner.banner_board_ID === board.id);
        res.render('layout', {
          pageTitle: `${board.title} - ${res.locals.setting.siteName}`,
          type: 'list',
          articles,
          notices,
          board,
          writePermission,
          pullUp,
          page,
          category,
          pn,
          searchUrl: board.slug,
          blockUsers,
          boardBanners,
        });
      } else { // 리스트 권한이 없을 때
        flash.create({
          status: false,
          message: '권한이 없습니다',
        });
        user ? res.redirect(req.headers.referer) : res.redirect('/login');
      }
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.read = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { category, page } = req.query;
    const { boardSlug, articleId } = req.params;
    const user = res.locals.user;
    const setting = res.locals.setting;
    const boardClass = new Board(req, res, conn);
    const articleClass = new Article(req, res, conn);
    const board = await boardClass.get(boardSlug);
    if (board) {
      const userGroupBoardClass = new UserGroupBoard(req, res, conn);
      const userGroupReadPermission = await userGroupBoardClass.check(board.id, 'readPermission');
      const userGroupCommentPermission = await userGroupBoardClass.check(board.id, 'commentPermission');
      if ((user?.permission >= board.readPermission || board.readPermission === 0) && (board.useUserGroupPermission && userGroupReadPermission || !board.useUserGroupPermission) || user?.isAdmin) {
        const commentPermission = user?.permission >= board.commentPermission || (board.useUserGroupPermission && userGroupCommentPermission || !board.useUserGroupPermission) || user?.isAdmin;
        const article = await articleClass.get(articleId, {
          status: 2,
          images: true,
          tags: true,
          userLike: true,
          boardPrevNextArticle: true,
        });
        if (article) {
          const commentClass = new Comment(req, res, conn);
          article.comments = await commentClass.getComments(articleId);
          if (!board.useSecret || board.useSecret && article.article_user_ID === user?.id || board.useSecret && user?.isAdmin || article.authorIsAdmin) {
            // 로그인 시 포인트 내역 조회
            const pointClass = new Point(req, res, conn);
            const readHistoryData = {
              user,
              type: 'read',
              articleId: article.id,
            };
            const readHistory = await pointClass.check(readHistoryData);
            // 포인트 체크
            if (!board.readPoint || article.article_user_ID === user?.id || readHistory || user?.point >= board.readPoint || board.readPoint === 0) {

              // 로그 추가
              addLog(req, board.title, article.id);
              
              // 조회수 증가
              if (req.cookies[article.id] === undefined) {
                res.cookie(article.id, req.ip, {
                  maxAge: 600000,
                });
                await conn.query(`UPDATE article SET viewCount=viewCount+1 WHERE id=?`, [article.id]);
              }
  
              // 포인트
              if (!readHistory && article.article_user_ID !== user?.id && !user?.isAdmin) {
                const data = {
                  user,
                  type: 'read',
                  point: board.readPoint,
                  boardId: board.id,
                  articleId: article.id,
                };
                await pointClass.remove(data);
              }

              // 이전글, 다음글
              if (setting.boardPrevNextArticle) {
                article.prevNextArticle = await articleClass.getPrevAfterArticle(article.id, board.id);
              }

              // 전체글
              if (setting.boardAllArticle) {
                const data = {
                  board,
                };
                const result = await articleClass.getArticles(data);
                article.totalArticles = result.articles;
                article.pn = result.pn;
              }

              // 작성자의 다른 게시글
              if (setting.boardAuthorArticle) {
                
              }

              // Block Users
              const userBlockUserClass = new UserBlockUser(req, res, conn);
              const blockUsers = await userBlockUserClass.getUsers(user?.id);
              const match = blockUsers.find(blockUser => blockUser.userBlockUser_targetUser_ID === article.article_user_ID);
              if (match) {
                article.content = `차단된 사용자의 글입니다`;
              }
              article.comments.forEach(comment => {
                const commentMatch = blockUsers.find(blockUser => blockUser.userBlockUser_targetUser_ID === comment.comment_user_ID);
                if (commentMatch) {
                  comment.block = true;
                  comment.content = `차단된 사용자의 댓글입니다`;
                }
                comment.replies.forEach(reply => {
                  const replyMatch = blockUsers.find(blockUser => blockUser.userBlockUser_targetUser_ID === reply.comment_user_ID);
                  if (replyMatch) {
                    reply.block = true;
                    reply.content = `차단된 사용자의 댓글입니다`;
                  }
                });
              });

              res.render('layout', {
                type: 'read',
                pageTitle: `${article.title} - ${board.title} - ${res.locals.setting.siteName}`,
                article,
                commentPermission,
                board,
                page,
                category,
                blockUsers,
              });
            } else {
              flash.create({
                status: false,
                message: '포인트가 부족합니다',
              });
              res.redirect(req.headers.referer);
            }
          } else {
            flash.create({
              status: false,
              message: '비밀글은 작성자와 관리자만 열람 가능합니다',
            });
            res.redirect(req.headers.referer);
          }
        } else {
          next();
        }
      } else { // 권한 없음
        flash.create({
          status: false,
          message: '권한이 없습니다',
        });
        if (user) {
          res.redirect(req.headers.referer);
        } else {
          res.redirect('/login');
        }
      }
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.new = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    const user = res.locals.user;
    const setting = res.locals.setting;
    if (method === 'GET') {
      const { boardSlug } = req.params;
      const boardClass = new Board(req, res, conn);
      const board = await boardClass.get(boardSlug, { categories: true });
      if (board) {
        const userGroupBoardClass = new UserGroupBoard(req, res, conn);
        const userGroupWritePermission = await userGroupBoardClass.check(board.id, 'writePermission');
        if ((user?.permission >= board.writePermission || board.writePermission === 0) && (board.useUserGroupPermission && userGroupWritePermission || !board.useUserGroupPermission) || user?.isAdmin) {
          const articleClass = new Article(req, res, conn);
          const data = {
            board,
            user,
          };
          if (req.cookies.writingTerm && !user?.isAdmin) {
            flash.create({
              status: false,
              message: `글쓰기는 ${setting.writingTerm.toLocaleString()}초 마다 가능합니다`,
            });
            res.redirect(req.headers.referer);
          } else {
            const articleId = await articleClass.createTemp(data);
            if (board.useOnce) {
              const [onceCheckResult, ] = await conn.query(`SELECT * FROM article WHERE article_board_ID=? AND article_user_ID=? AND status=?`, [board?.id, user?.id, 2]);
              if (onceCheckResult.length && !user?.isAdmin) {
                flash.create({
                  status: false,
                  message: `${board.title} 게시판은 한번만 작성가능합니다`,
                });
                res.redirect(req.headers.referer);
              } else {
                if (res.locals.setting.editor === 'engine') {
                  res.render('layout', {
                    type: 'new',
                    pageTitle: `새글 - ${res.locals.setting.siteName}`,
                    board,
                    articleId,
                  });
                } else if (res.locals.setting.editor === 'ckeditor') {
                  res.render('layout', {
                    type: 'newClassic',
                    pageTitle: `새글 - ${res.locals.setting.siteName}`,
                    board,
                    articleId,
                  });
                }
              }
            } else {
              if (res.locals.setting.editor === 'engine') {
                res.render('layout', {
                  type: 'new',
                  pageTitle: `새글 - ${res.locals.setting.siteName}`,
                  board,
                  articleId,
                });
              } else if (res.locals.setting.editor === 'ckeditor') {
                res.render('layout', {
                  type: 'newClassic',
                  pageTitle: `새글 - ${res.locals.setting.siteName}`,
                  board,
                  articleId,
                });
              }
            }
          }
        } else {
          flash.create({
            status: false,
            message: '권한이 없습니다',
          });
          res.redirect(req.headers.referer);
        }
      } else {
        next();
      }
    } else if (method === 'POST') {
      const { boardSlug } = req.params;
      const { articleId } = req.body;
      const boardClass = new Board(req, res, conn);
      const board = await boardClass.get(boardSlug);
      const articleClass = new Article(req, res, conn);
      const article = await articleClass.get(articleId);
      const {  title, content, tags, links, nickName, password, customField01, customField02, customField03, customField04, customField05, customField06, customField07, customField08, customField09, customField10 } = req.body;
      const notice = req.body.notice || 0;
      const nametag = req.body.nametag || 0;
      const category = req.body.category || null;
      const files = req.files.files;
      const data = {
        board,
        boardId: board.id,
        categoryId: category,
        title,
        content,
        tags,
        notice,
        nametag,
        nickName,
        password,
        status: 2,
        customField01,
        customField02,
        customField03,
        customField04,
        customField05,
        customField06,
        customField07,
        customField08,
        customField09,
        customField10,
        updatedAt: new Date(),
        createdAt: new Date(),
        links,
        files,
      };
      if (board) {
        const userGroupBoardClass = new UserGroupBoard(req, res, conn);
        const userGroupWritePermission = await userGroupBoardClass.check(board.id, 'writePermission');
        if ((user?.permission >= board.writePermission || board.writePermission === 0) && (board.useUserGroupPermission && userGroupWritePermission || !board.useUserGroupPermission) || user?.isAdmin) {
          if (res.locals.setting.editor === 'engine') {
            await articleClass.create(article.id, data);
            res.redirect(`/${boardSlug}/${articleId}`);
          } else if (res.locals.setting.editor === 'ckeditor') {
            if (req.cookies.writingTerm && !user?.isAdmin) {
              flash.create({
                status: false,
                message: `글쓰기는 ${setting.writingTerm.toLocaleString()}초 마다 가능합니다`,
              });
              res.redirect(req.headers.referer);
            } else {
              if (board.useOnce) {
                const [onceCheckResult, ] = await conn.query(`SELECT * FROM article WHERE article_board_ID=? AND article_user_ID=? AND status=?`, [board.id, user.id, 2]);
                if (onceCheckResult.length && !user?.isAdmin) {
                  flash.create({
                    status: false,
                    message: `${board.title} 게시판은 한번만 작성가능합니다`,
                  });
                  res.redirect(`/${boardSlug}/new`);
                } else {
                  const result = await articleClass.create(article.id, data);
                  if (result) {
                    flash.create({
                      status: true,
                      message: '글쓰기에 성공했습니다',
                    });
                    res.cookie('writingTerm', true, {
                      maxAge: setting.writingTerm * 1000,
                    });
                    res.redirect(`/${boardSlug}/${articleId}`);
                  } else {
                    flash.create({
                      status: false,
                      message: '글쓰기에 실패했습니다',
                    });
                    res.redirect(req.headers.referer);
                  }
                }
              } else {
                const result = await articleClass.create(article.id, data);
                if (result) {
                  flash.create({
                    status: true,
                    message: '글쓰기에 성공했습니다',
                  });
                  res.cookie('writingTerm', true, {
                    maxAge: setting.writingTerm * 1000,
                  });
                  res.redirect(`/${boardSlug}/${articleId}`);
                } else {
                  flash.create({
                    status: false,
                    message: '글쓰기에 실패했습니다',
                  });
                  res.redirect(req.headers.referer);
                }
              }
            }
          }
        } else {
          next();
        }
      } else {
        next();
      }
    }
  } finally {
    conn.release();
  }
});

exports.edit = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { boardSlug, articleId } = req.params;
    const { method } = req;
    if (method === 'GET') {
      const editor = res.locals.setting.editor;
      const boardClass = new Board(req, res, conn);
      const board = await boardClass.get(boardSlug, { categories: true });
      if (board) {
        const articleClass = new Article(req, res, conn);
        const article = await articleClass.get(articleId, {
          images: true,
          tags: true,
        });
        if (article) {
          res.render('layout', {
            pageTitle: `글수정 - ${res.locals.setting.siteName}`,
            type: editor === 'engine' ? 'edit' : 'editClassic',
            board,
            article,
          });
        } else {
          next();
        }
      } else {
        next();
      }
    } else if (method === 'POST') {
      const { password } = req.body;
      const user = res.locals.user;
      const boardClass = new Board(req, res, conn);
      const board = await boardClass.get(boardSlug);
      if (board) {
        const articleClass = new Article(req, res, conn);
        const article = await articleClass.get(articleId);
        if (article) {
          const data = {
            password,
          };
          try {
            await articleClass.remove(articleId, data);
            flash.create({
              status: true,
              message: '게시글을 삭제하였습니다',
            });
            res.redirect(`/${boardSlug}`);
          } catch (e) {
            flash.create({
              status: false,
              message: e.message,
            });
            res.redirect(req.headers.referer);
          }
        } else {
          next();
        }
      } else {
        next();
      }
    }
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

exports.update = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { boardSlug, articleId } = req.params;
    const { title, content, tags, links, nickName, password, customField01, customField02, customField03, customField04, customField05, customField06, customField07, customField08, customField09, customField10 } = req.body;
    const notice = req.body.notice || 0;
    const category = req.body.category || null;
    const articleClass = new Article(req, res, conn);
    const files = req.files.files;
    const data = {
      title,
      content,
      tags,
      notice,
      nickName,
      password,
      categoryId: category,
      customField01,
      customField02,
      customField03,
      customField04,
      customField05,
      customField06,
      customField07,
      customField08,
      customField09,
      customField10,
      updatedAt: new Date(),
      links,
      files,
    };
    try {
      const result = await articleClass.update(articleId, data);
      res.redirect(`/${boardSlug}/${articleId}`);
    } catch (e) {
      flash.create({
        status: false,
        message: e.message,
      });
      res.redirect(req.headers.referer);
    }
  } finally {
    conn.release();
  }
});

exports.pullUp = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { boardSlug } = req.params;
    const user = res.locals.user;
    const boards = res.locals.boards;
    const board = boards.find(board => board.slug === boardSlug);
    if (board && board.useOnce) {
      await conn.query(`UPDATE article SET updatedAt=NOW(), createdAt=NOW() WHERE article_board_ID=? AND article_user_ID=? AND status=? ORDER BY createdAt DESC LIMIT 1`, [board.id, user.id, 2]);
      flash.create({
        status: true,
        message: '내 게시글을 끌어 올렸습니다',
      });
    }
    res.redirect(req.headers.referer);
  } finally {
    conn.release();
  }
});
/*
const push = new pushmessage();
//푸시 발송
exports.pushcomment = doAsync(async (req, res, next) => {
  const conn = await poll.connection();
  try{ 
    const { link, articleId } = req.body;  //게시글 페이지 주소, 게시물 아이디
    const push_user_id = await conn.query("SELECT article_user_ID FROM user id=?", [articleId]);
    const playerID = await conn.query("SELECT onesignal_id FROM user WHERE id=?", [push_user_id]);
    const player_id_array = new Array();
    if(playerID){
      player_id_array.push(playerID);
    }
    else{
      const token = await conn.query("SELECT appToken FROM user WHERE id=?", [push_user_id]);
      player_id_array.push(token);
    }
    const push_target_all = new Array();
    const { data } = push.composebody(
      link,
      "내 게시물에 댓글이 달렸습니다.",
      "내 게시물에 댓글이 달렸어요 어서 확인해보세요!",
      push_target_all,
      player_id_array,
      "../public/asset/vetween_logo.png",
    );
    push.config();
    const {id} = await push.createNotification(data);
    await viewNotification(id);
  }catch(error){
    console.log('fail to push noti');
  }
});

exports.pushreply = doAsync(async (req, res, next) => {
  const conn = await poll.connection();
  try{ 
    const { link, commentParentId } = req.body;  //게시글 페이지 주소, 게시물 아이디
    const playerID = await conn.query("SELECT onesignal_id FROM user WHERE id=?", [commentParentId]);
    const player_id_array = new Array();
    if(playerID){
      player_id_array.push(playerID);
    }
    else{
      const token = await conn.query("SELECT appToken FROM user WHERE id=?", [push_user_id]);
      player_id_array.push(token);
    }
    const push_target_all = new Array();
    const { data } = push.composebody(
      link,
      "내 댓글에 답글이 달렸습니다.",
      "내 댓글에 답글이 달렸어요! 어서 확인해보세요!",
      push_target_all,
      player_id_array,
      "../public/asset/vetween_logo.png",
    );
    push.config();
    const {id} = await push.createNotification(data);
    await viewNotification(id);
  }catch(error){
    console.log('fail to push noti');
  }
});
*/
