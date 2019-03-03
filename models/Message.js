const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const messageSchema = new mongoose.Schema({
    // room: {
    //     type: ObjectId,
    //     ref: 'Room'
    //     // required: true
    // },
    // owner: {
    //     type: ObjectId,
    //     ref: 'User'
    //     // required: true
    // },
    name: {
        type: String
        // required: true
    },
    message: {
        type: String
    }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message
