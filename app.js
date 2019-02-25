/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, 'uploads') });

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env.example' });

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const apiController = require('./controllers/api');
const contactController = require('./controllers/contact');
const reportController = require('./controllers/report');
const roomController = require('./controllers/room');
const messageController = require('./controllers/message');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
 const app = express();
 const server = require('http').Server(app);
 const io = require('socket.io')(server);

/**
 * Connect to MongoDB.
 */
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.use(express.static(path.join(__dirname, '/public')));
app.use(expressStatusMonitor({ websocket: io, port: app.get('port') }));

app.use(compression());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public')
}));
app.set('view engine', 'pug')
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
  store: new MongoStore({
    url: process.env.MONGODB_URI,
    autoReconnect: true,
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  if (req.path === '/api/upload') {
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user
    && req.path !== '/login'
    && req.path !== '/signup'
    && !req.path.match(/^\/auth/)
    && !req.path.match(/\./)) {
    req.session.returnTo = req.originalUrl;
  } else if (req.user
    && (req.path === '/account' || req.path.match(/^\/api/))) {
    req.session.returnTo = req.originalUrl;
  }
  next();
});
app.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/popper.js/dist/umd'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/jquery/dist'), { maxAge: 31557600000 }));
app.use('/webfonts', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts'), { maxAge: 31557600000 }));

// const ExpressBrute = require('express-brute')
// const ExpressBruteMongooseStore = require('express-brute-mongoose')
//
// const EBstore = new ExpressBruteMongooseStore(db.Bruteforce)
// const bruteforce = new ExpressBrute(EBstore, {
//   freeRetries: 5,
//   minWait: 60 * 1000,
//   maxWait: 5 * 60 * 1000,
//   refreshTimeoutOnRequest: false,
//   failCallback (req, res, next, nextValidRequestDate) {
//     req.flash('alert', {
//       class: 'error',
//       title: lang.t('auth:errors.toomanyattempts'),
//       message: lang.t('auth:errors.toomanyattemptsmsg', { time: moment(nextValidRequestDate).fromNow() }),
//       iconClass: 'fa-times'
//     })
//     res.redirect('/login')
//   }
// })

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login',
// bruteforce.prevent,
userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/accounts/create', passportConfig.isAuthenticated, userController.getCreateAccount);
app.post('/accounts/create', passportConfig.isAuthenticated, userController.postCreateAccount);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.post('/accounts/:accountId/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/accounts/:accountId/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.post('/accounts/:accountId/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.get('/accounts', passportConfig.isAuthenticated, userController.getAllUsers);
app.get('/accounts/:accountId', passportConfig.isAuthenticated, userController.getUserAccount);
app.get('/invite', passportConfig.isAuthenticated, userController.getInviteUser);
app.post('/accounts/:accountId/invite', passportConfig.isAuthenticated, userController.postInviteUser);
app.get('/invite/:token', userController.getInvite);
app.post('/invite/:token', userController.postInvite);
app.post('/accounts/:accountId/admin', passportConfig.isAuthenticated, userController.postMakeAdmin)
app.post('/accounts/:accountId/revoke', passportConfig.isAuthenticated, userController.postRevokeAdmin)


/**
 * Report routes
 */
app.get('/reports', passportConfig.isAuthenticated, reportController.getNewReport)
app.post('/reports', passportConfig.isAuthenticated, reportController.createReport)
app.get('/reports/:reportId', passportConfig.isAuthenticated, reportController.showReport)
app.get('/reports/:reportId', passportConfig.isAuthenticated, reportController.getUpdateReport)
app.put('/reports/:reportId', passportConfig.isAuthenticated, reportController.putUpdateReport)
app.delete('/reports/:reportId', passportConfig.isAuthenticated, reportController.deleteReport)

/**
 * Room routes
 */
app.get('/rooms', passportConfig.isAuthenticated, roomController.listRooms)
app.get('/rooms/:roomId', passportConfig.isAuthenticated, roomController.showRoom)
app.delete('/rooms/:roomId', passportConfig.isAuthenticated, roomController.deleteRoom)

/**
 * Messages routes
 */
// app.get('/rooms/:roomId/messages', passportConfig.isAuthenticated, messageController.getNewMessage)
// app.post('/rooms/:roomId/messages', passportConfig.isAuthenticated, messageController.createMessage)
// app.get('/rooms/:roomId/messages', passportConfig.isAuthenticated, messageController.listMessages)
// app.get('/rooms/:roomId/messages/:messageId', passportConfig.isAuthenticated, messageController.deleteMessage)

app.get('/messages', messageController.getMessages)
app.post('/messages', messageController.postMessages)

/**
 * API examples routes.
 */
app.get('/api', apiController.getApi);

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
} else {
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Server Error');
  });
}

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

module.exports = app;
