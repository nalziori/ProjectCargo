const http = require('http');
const path = require('path');
const express = require('express');
const { exec } = require('child_process');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const timeout = require('connect-timeout');
const { sessionSecret } = require('./config');
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./middleware/database');
const logger = require('morgan');
const i18n = require('i18n');
const doAsync = require('./middleware/doAsync');
const shuffle = require('./middleware/shuffle');
const count = require('./middleware/count');
const config = require('./middleware/config');
const User = require('./services/user');
const UserGroup = require('./services/userGroup');
const IndexBoard = require('./services/indexBoard');
const Menu = require('./services/menu');
const Alarm = require('./services/alarm');
const Message = require('./services/message');
const Setting = require('./services/setting');
const Banner = require('./services/banner');
const Board = require('./services/board');
const Asset = require('./services/asset');
const Permission = require('./services/permission');

const sql = config.getDatabase();
const s3 = config.getS3();
const lang = config.getLang();

const indexRouter = require('./routes/index');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const apiRouter = require('./routes/api');
const boardRouter = require('./routes/board');
const landingRouter = require('./routes/landing');
const offlineRouter = require('./routes/offline');
const pluginRouter = require('./routes/plugin');

const app = express();

const port = process.env.PORT || 3000;

// Chat
const chat = require('./middleware/chat');
app.io = require('socket.io')();
const server = http.createServer(app);
app.io.attach(server);

app.io.on('connection', (socket) => {
  app.io.sockets.emit('userCount', app.io.engine.clientsCount);

  socket.on('disconnect', () => {
    // console.log('접속 해제');
    app.io.sockets.emit('userCount', app.io.engine.clientsCount);
  });

  socket.on('sendMessage', async (data) => {
    app.io.sockets.emit('updateMessage', data);
    await chat.add('all', null, data);
  });

  // Room Chat
  socket.on('leaveRoom', (room, user) => {
    socket.leave(room, () => {
      app.io.to(room).emit('leaveRoom', room);
    });
  });

  socket.on('joinRoom', (room, user) => {
    socket.join(room, () => {
      app.io.to(room).emit('joinRoom', room);
    });
  });

  socket.on('roomChat', async (data) => {
    const { type, room } = data;
    app.io.to(data.room).emit('roomChat', data);
    await chat.add(type, room, data);
  });
});

//app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const options = {
  host: sql.host,
  port: sql.port,
  user: sql.user,
  password: sql.password,
  database: sql.database,
};

const sessionStore = new MySQLStore(options);

if (process.env.NODE_ENV === 'development') {
  // app.use(logger('dev'));
} else {
  app.use(logger('dev'));
}

app.use(express.json());
app.use(timeout('60s'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  key: sessionSecret,
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 365,
  },
}));

i18n.configure({
  locales: [`${lang}`],
  cookie: 'lang',
  defaultLocale: `${lang}`,
  directory: path.join(__dirname + '/locales'),
});
app.use(i18n.init);

// Loop
// const loop = require('./middleware/loop');

// Setting
app.use('*', doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (req.session.user) {
      const userClass = new User(req, res, conn);
      const user = await userClass.get(req.session.user.id);
      if (user) res.locals.user = user;
    }

    res.locals.s3Host = s3.host;

    const menuClass = new Menu(req, res, conn);
    const bannerClass = new Banner(req, res, conn);
    const permissionClass = new Permission(req, res, conn);
    const settingClass = new Setting(req, res, conn);
    const boardClass = new Board(req, res, conn);
    const assetClass = new Asset(req, res, conn);
    const userGroupClass = new UserGroup(req, res, conn);
    
    const menus = await menuClass.getMenus();
    const banners = await bannerClass.getBanners();
    const permissions = await permissionClass.getPermissions();
    const setting = await settingClass.get();
    const boards = await boardClass.getBoards();
    const userGroups = await userGroupClass.getUserGroups();
    const assets = assetClass.getAssets();
    res.locals.menus = menus;
    res.locals.banners = banners;
    res.locals.permissions = permissions;
    res.locals.setting = setting;
    res.locals.boards = boards;
    res.locals.assets = assets;
    res.locals.userGroups = userGroups;
    res.locals.shuffle = shuffle;


    setting.footerGuide = setting.footerGuide?.replaceAll('\r\n', '<br>');

    const indexBoard = new IndexBoard(req, res, conn);
    res.locals.sideBoards = await indexBoard.get('side');
    if (res.locals.setting.useVisitCount) res.locals.count = await count.getCount();
    next();
  } finally {
    conn.release();
  }
}));

app.use('*', doAsync(async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    // 회원
    const user = res.locals.user;
    if (user) {
      const alarm = new Alarm(req, res, conn);
      const message = new Message(req, res, conn);
      const permissionClass = new Permission(req, res, conn);
      res.locals.alarms = await alarm.getAlarms(user);
      res.locals.messages = await message.getMessages(user);

      // 회원 등급 이미지
      const permissionImage = res.locals.permissions.find(permission => permission.permission === user.permission && permission.image);
      if (permissionImage) {
        user.permissionImage = `${res.locals.s3Host}/permission/${permissionImage.image}`;
      } else if (user.permission) {
        user.permissionImage = `/assets/permission/${user.permission}.svg`;
      } else {
        user.permissionImage = `/assets/permission/0.svg`;
      }

      // 자동 등업 체크
      if (res.locals.setting.useAutoPermission) {
        await permissionClass.check();
      }
    }
    next();
  } finally {
    conn.release();
  }
}));

// Plugin
app.use('*', doAsync(async (req, res, next) => {
  //
  const hash = res.locals.setting.hash;
  if (hash === 'hashcode') {
    
  }
  next();
}));

// Plugin
// require('./middleware/plugin')(app);

// Flash Message
require('./middleware/flash').init(app);

const { isAdmin } = require('./middleware/permission');

app.use('/', indexRouter);
app.use('/catch', indexRouter);
app.use('/', userRouter);
app.use('/admin', isAdmin, adminRouter);
app.use('/api', apiRouter);
app.use('/', boardRouter);
app.use('/', landingRouter);
app.use('/', offlineRouter);
app.use('/', pluginRouter);

// Error Handling
// 500 Error
let timeoutUrl = null;
app.use('*', (err, req, res, next) => {
  console.error(err);
  if (err.name === 'TypeError' || err.name === 'ReferenceError') {
    res.status(500).json({
      error: 'EJS Rendering Error',
    });
  } else if (err.name === 'ServiceUnavailableError') {
    if (timeoutUrl === null) timeoutUrl = req.originalUrl;
    const message = `${req.method}: ${timeoutUrl}`;
    console.error(`First timeoutUrl is ${message}`);
    exec('pm2 restart all');
    res.status(500).json({
      error: `${err.message} // ${message}`,
    });
  } else {
    res.status(500).json({
      error: err.message,
    });
  }
});

// 404 Error
app.use('*', (req, res, next) => {
  res.status(404).render('layout', {
    type: '404',
    pageTitle: `404 Not Found`,
  });
});

// uncaughtException
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
});

server.listen(port, () => console.log('Server is running... http://localhost:' + port));

module.exports = app;