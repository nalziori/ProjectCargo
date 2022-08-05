const express = require('express');
const router = express.Router();
const controller = require('../controllers/index');
const { isLogin, isWorkingUser, isAdmin } = require('../middleware/permission');
const doAsync = require('../middleware/doAsync');

// Auth
router.get('/auth/apple', controller.authApple);
router.get('/auth/google', controller.authGoogle);
router.get('/auth/facebook', controller.authFacebook);
router.get('/auth/twitter', controller.authTwitter);
router.get('/auth/naver', controller.authNaver);
router.get('/auth/kakao', controller.authKakao);

// Auth callback
router.post('/auth/apple/callback', controller.authAppleCallback);
router.get('/auth/google/callback', controller.authGoogleCallback);
router.get('/auth/facebook/callback', controller.authFacebookCallback);
router.get('/auth/twitter/callback', controller.authTwitterCallback);
router.get('/auth/naver/callback', controller.authNaverCallback);
router.get('/auth/kakao/callback', controller.authKakaoCallback);

router.get('/join', controller.join);
router.post('/join', controller.join);
router.post('/join/agreement', controller.joinAgreement);

router.get('/login', controller.login);
router.post('/login', controller.login);
router.get('/logout', controller.logout);

// Authentication
router.get('/emailAuthentication', controller.emailAuthentication);
router.post('/emailAuthentication', controller.emailAuthentication);
router.get('/smsAuthentication', controller.smsAuthentication);
router.post('/smsAuthentication', controller.smsAuthentication);

router.use('*', doAsync(async (req, res, next) => {
  const user = res.locals.user;
  const setting = res.locals.setting;
  if (user && setting.useEmailAuthentication && !user.emailAuthentication && !user.isAdmin && !user.workingUser) {
    res.redirect('/emailAuthentication');
  } else if (user && setting.useSmsAuthentication && !user.phoneAuthentication && !user.isAdmin && !user.workingUser) {
    res.redirect('/smsAuthentication');
  } else {
    next();
  }
}));

router.get('/', controller.index);
router.get('/catch', controller.index);
router.get('/catch/:userid', controller.catchUserID);
router.get('/go/:slug', controller.go);

// Chat Room
router.get('/chatRoom', controller.chatRoom);
router.get('/chatRoom/:hash', controller.chatRoom);

// 유저 변경
router.get('/changeUser', isWorkingUser, controller.changeUser);
router.post('/changeUser', isWorkingUser, controller.changeUser);

// 출석체크
router.get('/check', controller.check);
router.post('/check', controller.check);

// 이메일 입력
router.get('/findInfo', controller.findInfo);
router.get('/findId', controller.findId);
router.get('/findId/email', controller.findIdEmail);
router.post('/findId/email', controller.findIdEmail);
router.get('/findId/sms', controller.findIdSms);
router.post('/findId/sms', controller.findIdSms);
router.get('/findId/sms/auth', controller.findIdSmsAuth);
router.post('/findId/sms/auth', controller.findIdSmsAuth);

router.get('/findPassword', controller.findPassword);
router.get('/findPassword/email', controller.findPasswordEmail);
router.post('/findPassword/email', controller.findPasswordEmail); // 코드 생성 발송
router.get('/findPassword/sms', controller.findPasswordSms);
router.post('/findPassword/sms', controller.findPasswordSms);
router.get('/findPassword/sms/auth', controller.findPasswordSmsAuth);
router.post('/findPassword/sms/auth', controller.findPasswordSmsAuth);
router.get('/findPassword/newPassword/:hash', controller.findPasswordComplete); // 새 비밀번호 입력
router.post('/findPassword/newPassword/:hash', controller.findPasswordComplete); // 새 비밀번호 저장

router.get('/robots.txt', controller.robots);
router.get('/sitemap.xml', controller.sitemap);
router.get('/sitemap/board.xml', controller.sitemapBoard);
router.get('/sitemap/article.xml', controller.sitemapArticle);
router.get('/sitemap/page.xml', controller.sitemapPage);
router.get('/sitemap/store.xml', controller.sitemapStore);
router.get('/ads.txt', controller.adsenseAds);

module.exports = router;