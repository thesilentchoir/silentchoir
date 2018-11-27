const Report = require('../models/Report.js');
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const roomSchema = new mongoose.Schema({
  alleged_party: {
    type: String
  },

  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  messages: [{
    type: ObjectId,
    ref: 'Message'
  }],

  created: {
    type: Date,
    default: Date.now
  },

  // in later iterations, the default should be true
  private: {
    type: Boolean,
    default: false
  },

  // in later iterations, the default should be true
  password: {
    type: String,
    required: false
  }
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
