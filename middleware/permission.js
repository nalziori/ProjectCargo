const flash = require('./flash');
const doAsync = require('./doAsync');

exports.isLogin = doAsync(async (req, res, next) => {
  const user = res.locals.user;
  if (user) {
    next();
  } else {
    //flash.create({
     // status: false,
     // message: '로그인이 필요합니다',
    // });
    alert("로그인이 필요합니다");
    res.redirect('/login');
  }
});

exports.isWorkingUser = doAsync(async (req, res, next) => {
  const user = res.locals.user;
  if (user?.workingUser || user.isManager || user.isAdmin) {
    next();
  } else {
   // flash.create({
   //   status: false,
   //   message: '로그인이 필요합니다',
   // });
   alert("로그인이 필요합니다");
    res.redirect('/login');
  }
});

exports.isAdmin = doAsync(async (req, res, next) => {
  const user = res.locals.user;
  if (user?.isAdmin) {
    next();
  } else {
    //  flash.create({
   //   status: false,
   //   message: '관리자 권한이 필요합니다',
  //  });
    alert("관리자 권한이 필요합니다");
    res.redirect('/login');
  }
});