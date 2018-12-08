const Room = require('../models/Room');

exports.listRooms = (req, res) => {
  Room.find((err, docs) => {
    res.render('rooms', { rooms: docs });
  });
}

exports.showRoom = (req, res) => {
  Room.findById(req.params.roomId, (err, room) => {
    let participantsObject = room.participants;
    let participantStringsArray = participantsObject.map(id => JSON.stringify(id));

    let idCheck = JSON.stringify(req.user.id);

    if (!participantStringsArray.includes(idCheck)) {
      req.flash('errors', { msg: 'Oops! Please pick a chatroom of which you are a member.' });
      return res.redirect('/account');
    }

    res.render('rooms/show', { room: room });
  })
}

exports.deleteRoom = (req, res) => {
  Room.findByIdAndRemove(req.params.roomId)
  .then(room => {
    if (!room) {
      return res.status(404).send({
        message: "Room not found!"
      });
    }
    res.send({message: "Room deleted successfully."});
  }).catch(err => {
    if(err.kind === 'ObjectId' || err.name === 'NotFound') {
      return res.status(404).send({
        message: "Room not found: " + req.params.roomId
      });
    }
    return res.status(500).send({
      message: "Could not delete room: " + req.params.roomId
    });
  });
}
