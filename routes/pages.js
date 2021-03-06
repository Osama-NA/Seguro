require('dotenv').config();
const express = require("express");
const session = require("express-session");
const MySQLStore = require('express-mysql-session')(session);
const flash = require("express-flash");
const passport = require("passport");
const methodOverride = require("method-override");
const userInfo = require("../utils/user-info");
const {
  checkAuthenticated,
  checkAuthenticatedAdmin,
  checkAuthenticatedBasicOrAdmin,
  checkNotAuthenticated,
} = require("../utils/auth-checker");
const room = require("../utils/room.js");

const router = express.Router();
const dbValues = {
  connectionLimit: process.env.DATABASE_CONNECTION_LIMIT,
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
};
//Store To Manage Sessions and avoid memory leak in production
const sessionStore = new MySQLStore(dbValues);

if (router.get('env') === 'production') {
  router.set('trust proxy', 1);
  session.cookie.secure = true;
}

router.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  saveUninitialized: true,
  resave: false
}));

router.use(flash());
router.use(passport.initialize());
router.use(passport.session());
router.use(methodOverride("_method"));

const incrementVisitorsCountController = require("../controllers/increment-visitors-count");
router.get("/", incrementVisitorsCountController.incrementVisitorsCount, checkNotAuthenticated, (req, res) => {
  room.deleteRoom(); //to make sure room object values are reset before creating new room in home page
  res.render("index");
});

router.get("/sign-in", checkNotAuthenticated, (req, res) => {
  res.render("sign-in");
});

router.get("/sign-up", checkNotAuthenticated, (req, res) => {
  res.render("sign-up");
});

router.get("/signed-index", checkAuthenticated, (req, res) => {
  room.deleteRoom(); //to make sure room object values are reset before creating new room in home page
  res.render("signed-index");
});

//Before redirecting to admin's home page,
//The function storeCounters is called in the middleware countersController.counters
//Then the counters are imported from '../utils/counters' and sent to the client side
const { counters } = require("../utils/counters");
const countersController = require('../controllers/counters-controller');
router.get("/admin-index", countersController.counters, checkAuthenticatedAdmin, (req, res) => {
  room.deleteRoom(); //to make sure room object values are reset before creating new room in home page
  res.render("admin-index", {appVisitorsCount: counters[0], roomsCreatedCount: counters[1]});
});

router.get("/add-admin", checkAuthenticatedAdmin, (req, res) => {
  res.render("add-admin");
});

router.get("/admin-edit-index", checkAuthenticatedAdmin, (req, res) => {
  res.render("admin-edit-index");
});

router.get("/edit-index", checkAuthenticated, (req, res) => {
  res.render("edit-index");
});

router.get("/contact-index", checkAuthenticated, (req, res) => {
  res.render("contact-index");
});

router.get("/room-expired", (req, res) => {
  res.render("room-expired");
});

//Sign Out
router.get("/sign-out", (req, res) => {
  userInfo.deleteUser();
  req.logOut();
  res.redirect("/sign-in");
});

//Waiting Room
const waitingRoomController = require("../controllers/waiting-room");
router.get("/waiting-room", waitingRoomController.waitingRoom);

//View Users
const viewUsersController = require("../controllers/view-users");
router.get("/view-users", checkAuthenticatedAdmin, viewUsersController.viewUsers);

//Contact Forms
const contactFormsController = require("../controllers/contact-forms");
router.get("/contact-forms", checkAuthenticatedAdmin, contactFormsController.contactForms);

//Reported Bugs
const reportedBugsController = require("../controllers/reported-bugs");
router.get("/bug-reports", checkAuthenticatedAdmin, reportedBugsController.reportedBugs);

//Chat Logs
const chatLogsController = require("../controllers/chat-logs");
router.get("/admin-chat-logs", checkAuthenticatedAdmin, chatLogsController.chatLogs);
router.get("/chat-logs", checkAuthenticated, chatLogsController.chatLogs);

//Creates Room id then redirects to get-name page or waiting-room page
const createRoomController = require("../controllers/create-room");
// Increments created rooms count in database
const roomsCreatedCountController = require("../controllers/rooms-created-count");
router.get("/create-room", roomsCreatedCountController.roomsCreatedCount, createRoomController.createRoom);

//When redirected to get-name page, checkSecondAccessController checks if it's the second user i.e the user who joined through link and sets the room id and access for second user 
const checkSecondAccessController = require("../controllers/check-second-access");
router.get("/url-get-name", checkSecondAccessController.checkSecondAccess, (req, res) => {
  res.render("url-get-name");
});

//Get Name
router.get("/get-name", (req, res) => {
  res.render("get-name");
});

//Sign in then join chat room
const chatRoomSignInController = require("../controllers/chat-room-sign-in");
router.get("/chat-room-sign-in", chatRoomSignInController.chatRoomSignIn);

//Check if required data is available then redirect to chat room
const checkRoomDataController = require("../controllers/check-room-data");
//Used to check if a user is joining expired room (already accessed by two)
const checkJoiningExpiredRoomController = require("../controllers/check-joining-expired-room");
router.get("/chat-room", checkRoomDataController.checkRoomData, checkJoiningExpiredRoomController.joiningExpiredRoom, (req, res) => {
  if (req.isAuthenticated()) {
    res.render("signed-chat-room");
  } else {
    res.render("chat-room");
  }
});

module.exports = router;
