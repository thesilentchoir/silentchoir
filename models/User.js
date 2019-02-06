const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    match: /^[\w][\w\-\.]*[\w]$/i
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,

  joined: {
    type: Boolean,
    default: false
  },
  admin: {
    type: Boolean,
    default: false
  },
  inviteToken: {
    type: String,
    default: null
  },
  inviteCreatedAt: {
    type: Date,
    default: null
  },
  inviteSentAt: {
    type: Date,
    default: null
  },
  inviteAcceptedAt: {
    type: Date,
    default: null,
  },
  invitationCount: {
    type: Number,
    default: 0
  },
  inviteExpires: {
    type: Date,
    default: null
  },
  invited: {
    type: Boolean,
    default: false
  },
  
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

userSchema.plugin(uniqueValidator);

const User = mongoose.model('User', userSchema);

module.exports = User;
