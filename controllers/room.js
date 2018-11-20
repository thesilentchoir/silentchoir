const Room = require('../models/Room');

exports.listRooms = (req, res) => {
  Room.find((err, docs) => {
    res.render('rooms', { rooms: docs });
  });
};
