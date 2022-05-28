const express = require('express');
const router = express.Router();
const controller = require('../controllers/user');
const { isLogin } = require('../middleware/permission');

/* GET home page. */
router.get('/mypage', isLogin, controller.mypage);
router.post('/mypage', isLogin, controller.mypage);

router.get('/mypage/article', isLogin, controller.myArticle);

router.get('/mypage/withdraw', isLogin, controller.withdraw);

router.get('/alarm', isLogin, controller.alarm);

router.get('/message', isLogin, controller.message);
router.get('/message/send', isLogin, controller.messageNew);
router.get('/message/send/:keyword', isLogin, controller.messageNew);
router.post('/message/send', isLogin, controller.messageNew);

router.get('/mypage/point', isLogin, controller.point);

router.get('/mypage/pointWithdraw', isLogin, controller.pointWithdraw);
router.post('/mypage/pointWithdraw/:userId', isLogin, controller.pointWithdraw);

module.exports = router;