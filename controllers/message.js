const Message = require('../models/Message');
const Room = require('../models/Room');

exports.getMessages = (req, res) => {
  res.render('messages');
}

exports.postMessages = (req, res) => {
  var message = new Message(
    {
      text: req.body.text
    }
  );
  message.save((err) => {
    if (err) {
      sendStatus(500);
    }
    // io.emit('message', req.body);
    res.sendStatus(200);
  })
}
