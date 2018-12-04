const Room = require('../models/Room');
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const reportSchema = new mongoose.Schema({
  alleged_party: {
    type: String,
    required: true
  }
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
