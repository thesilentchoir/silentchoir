const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const validate = require('mongoose-validate')

const userSchema = new mongoose.Schema({
  firstName: {
    type: String
    // required: true,
  },

  lastName: {
    type: String
    // required: true,
  },

  username: {
    type: String,
    // required: true,
    lowercase: true,
    unique: true,
    match: /^[\w][\w\-\.]*[\w]$/i
  },

  rooms: [{
    type: ObjectId,
    ref: 'Room'
  }],

  reports: [{
    type: ObjectId,
    ref: 'Report'
  }],

  messages: [{
    type: ObjectId,
    ref: 'Message'
  }],
    
  email: {
    type: String,
    // required: true,
    unique: true,
    lowercase: true,
    validate: [ validate.email, 'invalid email address' ]
  },

  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,

  joined: {
    type: Date,
    default: Date.now
  },

  admin: {
    type: Boolean,
    default: false
  },

  facebook: String,
  twitter: String,
  google: String,
  github: String,
  instagram: String,
  linkedin: String,
  steam: String,
  tokens: Array
}, { timestamps: true });

/**
 * Password hash middleware.
 */
userSchema.pre('save', function save(next) {
  const user = this;
  if (!user.isModified('password')) { return next(); }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) { return next(err); }
    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) { return next(err); }
      user.password = hash;
      next();
    });
  });
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function gravatar(size) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash('md5').update(this.email).digest('hex');
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
