const room = require("../utils/room");
const db = require("../utils/db-connection.js");

//checks whether the room id and username are set and checks if access one or two (user-1/2) are set,
//if any is not set then user is redirected to home page otherwise to chat room
exports.checkRoomData = (req, res, next) => {
  const roomData = room.getRoom();
  const roomID = roomData["id"];
  const roomUsername = roomData["username"];
  const roomAccess =
    roomData["access-two"] === "true"
      ? "user two"
      : roomData["access-one"] === "true"
      ? "user one"
      : undefined;

  if (roomID && roomAccess && roomUsername) {
    createOrUpdateRoom(roomID, roomAccess, res);
    room.setAccessTwo("false");
    return next();
  }

  return redirect(req, res);
};

//If access by user one, update access_one in chat rooms table 
//If access by user two, inset new room chat rooms table with access_one set to 0 and access_two set to 1
function createOrUpdateRoom(roomID, roomAccess, res) {
  if (roomAccess == "user one") {
    db.query(
      "UPDATE chat_rooms SET access_one = 1 WHERE room_id= ?", [roomID],() => {
        console.log("User one joined chat room");
      }
    );
  } else if (roomAccess == "user two") {
    //Before Setting access by user two, check if user two already joined
    checkUserTwoAlreadyJoined(roomID, res);
    db.query(
      "INSERT INTO chat_rooms SET ?",
      { room_id: roomID, access_one: 0, access_two: 1 }, () => {
        console.log("User two joined chat room");
      }
    );
  }  
}

//Checks if access_one and access_two are already set
//If they are then this is a third access so the user is redirected to room expired page
function checkUserTwoAlreadyJoined(id, res) {
  db.query(
    "SELECT access_two,access_one FROM chat_rooms WHERE room_id= ?",
    [id],
    (err, results) => {
      if (results.length > 0) {
        if (results[0].access_two === 1 && results[0].access_one === 1)
          return res.redirect("/room-expired");
      }
    }
  );
}

function redirect(req, res) {
  if (req.isAuthenticated()) {
    let role = userInfo.getItem("role");
    if (role === "basic") {
      return res.redirect("/signed-index");
    }
    if (role === "admin") {
      return res.redirect("/admin-index");
    }
  }
  return res.redirect("/");
}