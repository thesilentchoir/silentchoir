const Room = require('../models/Room');
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const reportSchema = new mongoose.Schema({
  username: {
    type: String
  },

  alleged_party: {
    type: String,
    required: true
  },

  room: {
    type: ObjectId,
    ref: 'Room'
  },

  user: {
    type: ObjectId,
    ref: 'User'
  }
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
