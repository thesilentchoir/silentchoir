const Message = require('../models/Message');
const Room = require('../models/Room');

exports.getNewMessage = (req, res) => {
  Room.findById(req.params.roomId, (err, room) => {
    res.render('messages/new');
  })
}

exports.listMessages = (req, res) => {
  Room.findById(req.params.roomId, (err, room) => {
    res.render('messages', { messages: room.messages });
  })
}

exports.createMessage = (req, res) => {
  req.assert('text', 'Message cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('rooms/:roomId/messages');
  }

  let message = new Message(
    {
      text: req.body.text,
      owner: req.user,
      room: req.params.roomId
    }
  );

  message.save(function (err) {
    if (err) {
      return next(err);
    }

    Room.findById(req.params.roomId, (err, room) => {
      room.messages.push(message);
      room.save();
    })

    Room.findById(req.params.roomId, (err, room) => {
      res.render('messages', { messages: room.messages });
    })
  })
}

exports.deleteMessage = (req, res) => {
  Message.findByIdAndRemove(req.params.messageId)
  .then(message => {
    if (!message) {
      return res.status(404).send({
        message: "Message not found!"
      });
    }
    res.send({message: "Message deleted successfully."});
  }).catch(err => {
    if(err.kind === 'ObjectId' || err.name === 'NotFound') {
      return res.status(404).send({
        message: "Message not found: " + req.params.messageId
      });
    }
    return res.status(500).send({
      message: "Could not delete message: " + req.params.messageId
    });
  });
}
