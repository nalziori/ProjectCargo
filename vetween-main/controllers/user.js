const pool = require('../middleware/database');
const flash = require('../middleware/flash');
const doAsync = require('../middleware/doAsync');
const User = require('../services/user');
const Article = require('../services/article');

exports.mypage = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    const user = res.locals.user;
    if (method === 'GET') {
      res.render('layout', {
        type: 'mypage',
        pageTitle: `마이페이지 - ${res.locals.setting.siteName}`,
        user,
      });
    } else if (method === 'POST') {
      const { nickName, oldPassword, password, passwordCheck } = req.body;
      const userClass = new User(req, res, conn);
      if (oldPassword) {
        if (password === passwordCheck) {
          const result = await userClass.passwordCheck(user, oldPassword);
          if (result) {
            const data = {
              nickName,
              password,
            };
            await userClass.update(user.id, data);
            //  flash.create({
         //     status: true,
         //     message: '회원정보를 변경하였습니다',
         //   });
         alert("회원정보를 변경하였습니다");
          } else {
            // flash.create({
            //  status: false,
            //  message: '기존 패스워드가 다릅니다',
           // });
           alert("기존 패스워드가 다릅니다");
          }
        } else {
          // flash.create({
          //  status: false,
          //  message: '입력한 패스워드가 서로 다릅니다',
         // });
         alert("입력한 패스워드가 서로 다릅니다");
        }
      } else {
        const data = {
          nickName,
        };
        await userClass.update(user.id, data);
        // flash.create({
       //   status: true,
       //   message: '회원정보를 변경하였습니다',
       // });
       alert("회원정보를 변경하였습니다");
      }
      res.redirect(req.headers.referer);
    }
  } finally {
    conn.release();
  }
});

exports.myArticle = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
    try {
      const { page } = req.query;
      const user = res.locals.user;
      const articleClass = new Article(req, res, conn);
      const data = {
        user,
      };
      const { articles, pn } = await articleClass.getArticles(data);
      res.render('layout', {
        type: 'myArticle',
        pageTitle: `내가 쓴 게시글 - ${res.locals.setting.siteName}`,
        articles,
        pn,
        page,
      });
    } finally {
      conn.release();
    }
});

exports.withdraw = doAsync(async (req, res, next) => {
  if (res.locals.setting.useWithdraw) {
    const conn = await pool.getConnection();
    try {
      const user = res.locals.user;
      const userclass = new User(req, res, conn);
      await userclass.remove(user.id);
      req.session.destroy(() => {
        res.redirect('/');
      });
    } finally {
      conn.release();
    }
  } else {
    next();
  }
});

exports.alarm = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const user = res.locals.user;
    await conn.query(`UPDATE alarm SET status=2 WHERE alarm_user_ID=?`, [user.id]);
    res.render('layout', {
      type: 'alarm',
      pageTitle: `알람 - ${res.locals.setting.siteName}`,
    });
  } finally {
    conn.release();
  }
});

exports.message = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (res.locals.user) {
      const userId = res.locals.user.id;
      await conn.query(`UPDATE message SET status=2 WHERE message_recipient_ID=?`, [userId]);
      res.render('layout', {
        type: 'message',
        pageTitle: `메시지 - ${res.locals.setting.siteName}`,
      });
    } else {
      // flash.create({
     //   status: false,
     //   message: '권한이 없습니다',
    //  });
    alert("권한이 없습니다");
      res.redirect('/login');
    }
  } finally {
    conn.release();
  }
});

exports.messageNew = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const setting = res.locals.setting;
    if (setting.useMessage) {
      const { method } = req;
      if (method === 'GET') {
        const { keyword } = req.params;
        res.render('layout', {
          type: 'messageNew',
          pageTitle: `메시지 보내기 - ${res.locals.setting.siteName}`,
          keyword,
        });
      } else if (method === 'POST') {
        const user = res.locals.user;
        const { keyword, content } = req.body;
        const [targetUsers, ] = await conn.query(`SELECT * FROM user WHERE uId=? OR nickName=?`, [keyword, keyword]);
        if (targetUsers.length) {
          const targetUser = targetUsers[0];
          const [result, ] = await conn.query(`INSERT INTO message (message_sender_ID, message_recipient_ID, content) VALUES (?, ?, ?)`, [user.id, targetUser.id, content]);
          if (result.insertId) {
            await conn.query(`INSERT INTO alarm (type, alarm_user_ID, alarm_relatedUser_ID, alarm_message_ID) VALUES (?, ?, ?, ?)`, ['message', targetUser.id, user.id, result.insertId]);
             // flash.create({
            //  status: true,
            //  message: '메시지를 전송하였습니다',
           // });
           alert("메시지를 전송하였습니다");
          } else {
            // .create({
            //  status: false,
            //  message: '메시지 전송에 실패했습니다',
           // });
           alert("메시지 전송에 실패했습니다");
          }
        } else {
          /*flash.create({
            status: false,
            message: '아이디 또는 닉네임이 존재하지 않습니다',
          });*/
          alert("아이디 또는 닉네임이 존재하지 않습니다");
        }
        res.redirect(req.headers.referer);
      }
    } else {
      next();
    }
  } finally {
    conn.release();
  }
});

exports.point = doAsync(async (req, res, next) => {
  res.render('layout', {
    type: 'point',
    pageTitle: `포인트 - ${res.locals.setting.siteName}`,
  });
});

exports.pointWithdraw = doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { method } = req;
    if (method === 'GET') {
      if (res.locals.user) {
        res.render('layout', {
          type: 'pointWithdraw',
          pageTitle: `포인트 출금신청 - ${res.locals.setting.siteName}`,
        });
      } else {
        flash.create({
          status: false,
          message: '권한이 없습니다',
        });
        res.redirect('/login');
      }
    } else if (method === 'POST') {
      const { userId } = req.params;
      const { type, comment } = req.body;
      const point = Number(req.body.point) || 0;
      // 포인트 조회
      const [users, ] = await conn.query(`SELECT * FROM user WHERE id=?`, [userId]);
      if (users.length) {
        const user = users[0];
        // 포인트 지급
        if (user.point >= point && point !== 0) {
          const pointWithdrawLimit = res.locals.setting.pointWithdrawLimit;
          if (point >= pointWithdrawLimit || pointWithdrawLimit === 0) {
            const [result, ] = await conn.query(`UPDATE user SET point=point-? WHERE id=?`, [point, userId]);
            // 포인트 지급 내역 등록
            const query = `INSERT INTO pointWithdraw
            (pointWithdraw_user_ID, type, point, comment)
            VALUES (?, ?, ?, ?)`;
            await conn.query(query, [user.id, type, point, comment]);
            await conn.query(`INSERT INTO point (point_user_ID, type, point) VALUES (?, ?, ?)`, [user.id, 'withdraw', point * -1]);
            flash.create({
              status: true,
              message: `출금신청 완료`,
            });
          } else {
            flash.create({
              status: false,
              message: `최소 출금가능 포인트가 부족합니다`,
            });
          }
        } else {
          flash.create({
            status: false,
            message: `지급 가능한 포인트가 부족합니다`,
          });
        }
      }
      res.redirect('/mypage/pointWithdraw');
    }
  } finally {
    conn.release();
  }
});