const Message = require('../models/Message');
const Room = require('../models/Room');
// const express = require('express');
// const app = express();
// const server = require('http').Server(app);
// const io = require('socket.io')(server);

exports.getMessages = (req, res) => {
  let currentUser = req.user.username;

  Room.findById({ _id: req.params.roomId }, (err, room) => {
    if (err) { return next(err); }

    // check participants
    let participantsObject = room.participants;
    let participantStringsArray = participantsObject.map(id => JSON.stringify(id));

    let currentUserId = JSON.stringify(req.user.id);

    if (participantStringsArray.includes(currentUserId)) {
      req.flash('success', { msg: 'Welcome!' });
      return res.render('messages', { messages: room.messages, username: currentUser });
    } else {
      return res.render('error-forbidden')
    }
  });
}
