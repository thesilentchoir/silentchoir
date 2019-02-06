const { promisify } = require('util');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');

const randomBytesAsync = promisify(crypto.randomBytes);

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  console.log(errors);

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Success! You are logged in.' });
      const redirectAfterLogin = '/accounts/' + req.user._id
      res.redirect( redirectAfterLogin || '/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) console.log('Error : Failed to destroy the session during logout.', err);
    req.user = null;
    res.redirect('/');
  });
};

/**
 * GET /account/create
 * Page to create a user --> Only available to admins
 */
exports.getCreateAccount = (req, res) => {
  if (!res.locals.user.admin) {
    return res.render('error-forbidden')
  }

  res.render('account/create', {
    title: 'Create Account',
    referringUser: req.user
  });
};

/**
 * POST /account/create
 * Create a new local account.
 */
exports.postCreateAccount = (req, res, next) => {
  if (!res.locals.user.admin) {
    return res.render('error-forbidden')
  }

  req.assert('email', 'Email is not valid').isEmail();
  req.assert('username', 'Username is not valid').isUsername();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/acccount/create');
  }

  const user = new User({
    username: req.body.username,
    email: req.body.email
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) { return next(err); }
    if (existingUser) {
      req.flash('errors', { msg: 'Account with that email address already exists.' });
      return res.redirect('/accounts/create');
    }
    user.save((err) => {
      if (err.name === "ValidationError") {
        req.flash('errors', { msg: 'Account with that username already exists.' });
        return res.redirect('/accounts/create');
      } else if (err) {
        return next(err);
      }
        res.redirect('/accounts');
    });
  });
};

/**
 * GET /accounts
 * A list of current user accounts -- only available to admins
 */
exports.getAllUsers = (req, res) => {
  if (!res.locals.user.admin) {
    return res.render('error-forbidden')
  }

  User.find((err, docs) => {
    res.render('accounts', { accounts: docs, referringUser: req.user })
  })
};

/**
 * GET /accounts/:accountId
 * Gets user accounts -- admins can navigate to any user page, non-admins can only view their own pages
 */
exports.getUserAccount = (req, res) => {
  if (!res.locals.user.admin) {
    if (req.user._id !== req.params.accountId) {
      return res.render('error-forbidden')
    }
  }

  User.findById(req.params.accountId, (err, user) => {
    const inviteActionRoute = "/accounts/" + req.params.accountId + "/invite"
    const adminGrantActionRoute = "/accounts/" + req.params.accountId + "/admin"
    const adminRevokeActionRoute = "/accounts/" + req.params.accountId + "/revoke"
    const deleteActionRoute = "/accounts/" + req.params.accountId + "/delete"
    const updatePasswordRoute = "/accounts/" + req.params.accountId + "/password"
    const updateProfileRoute = "/accounts/" + req.params.accountId + "/profile"
    const referringUserRoute = "/accounts/" + req.user._id
    res.render("account/profile", { user: user, referringUserRoute: referringUserRoute, updateProfileAction: updateProfileRoute, inviteAction: inviteActionRoute, adminGrantAction: adminGrantActionRoute, adminRevokeAction: adminRevokeActionRoute, updatePasswordAction: updatePasswordRoute, deleteAction: deleteActionRoute, referringUser: req.user });
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect(req.headers.referer);
  }

  User.findById(req.params.accountId, (err, user) => {
    console.log("HERE")
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.username = req.body.username || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
          return res.redirect(req.headers.referer);
        }
        return next(err);
      }
      req.flash('success', { msg: 'Profile information has been updated.' });
      res.redirect(req.headers.referer);
    });
  });
};

/**
 * POST /accounts/:accountId/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.params.accountId, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect(req.headers.referer);
    });
  });
};

/**
 * POST /accounts/:accountId/delete
 * Delete user account
 * if originating user's account -- allow
 * if not originating user's account -- check if admin, allow; if not admin, forbidden
 */
exports.postDeleteAccount = (req, res, next) => {
  if (req.user._id === req.params.accountId) {
    User.deleteOne({ _id: req.params.accountId }, (err) => {
      if (err) { return next(err); }
      if (req.params.accountId === req.user._id) {
        req.logout();
        req.flash('info', { msg: 'Your account has been deleted.' });
        res.redirect('/');
      } else {
        req.flash('info', { msg: 'Account has been deleted.' });
        res.redirect('/accounts');
      }
    });
  } else if (req.user.admin === true) {
    User.deleteOne({ _id: req.params.accountId }, (err) => {
      if (err) { return next(err); }
      if (req.params.accountId === req.user._id) {
        req.logout();
        req.flash('info', { msg: 'Your account has been deleted.' });
        res.redirect('/');
      } else {
        req.flash('info', { msg: 'Account has been deleted.' });
        res.redirect('/accounts');
      }
    });
  } else {
    return res.render('error-forbidden')
  }
};

/**
 * POST /account/admin
 * Make user account an admin.
 */
exports.postMakeAdmin = (req, res, next) => {
  User.findById({ _id: req.params.accountId }, (err, user) => {
    if (err) { return next(err); }
    user.admin = true;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: 'Account has been granted admin rights' });
      res.redirect(req.headers.referer);
    })
  });
};

exports.postRevokeAdmin = (req, res, next) => {
  User.findById({ _id: req.params.accountId }, (err, user) => {
    if (err) { return next(err); }
    user.admin = false;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: 'Admin rights have been revoked for this account' });
      res.redirect(req.headers.referer);
    })
  });
};

exports.getInviteUser = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }

  if (!res.locals.user.admin) {
    return res.render('error-forbidden')
  }

  res.render('account/invite', {
    title: 'Invite New User'
  });
};

exports.postInviteUser = (req, res, next) => {
  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/invite');
  }

  const createRandomToken = randomBytesAsync(16)
    .then(buf => buf.toString('hex'));

  const setRandomToken = token =>
    User
      .findById({ _id: req.params.accountId })
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Account with that email address does not exist.' });
        } else {
          console.log(token);
          user.inviteToken = token;
          user.inviteExpires = Date.now() + 3600000; // 1 hour
          user.invitationCount = user.invitationCount + 1;
          user.inviteCreatedAt = Date.now();
          user.inviteSentAt = Date.now();
          user.invited = true;
          user = user.save();
        }
        console.log(user);
        return user;
      });

  const sendInviteEmail = (user) => {
    const token = user.inviteResetToken;
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'support@silentchoir.com',
      subject: 'Invitation to join Silent Choir',
      text: `You are receiving this email because you have been invited to join Silent Choir.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        http://${req.headers.host}/invite/${token}\n\n
        If you did not request this, please ignore this email.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
         console.log(token);
        req.flash('info', { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
      })
      .catch((err) => {
        if (err.message === 'self signed certificate in certificate chain') {
          console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
          transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
              user: process.env.SENDGRID_USER,
              pass: process.env.SENDGRID_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('info', { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
            });
        }
        console.log('ERROR: Could not send invitation email after security downgrade.\n', err);
        req.flash('errors', { msg: 'Error sending the invitation. Please try again shortly.' });
        return err;
      });
    }
    createRandomToken
      .then(setRandomToken)
      .then(sendInviteEmail)
      .then(() => res.redirect(req.headers.referer))
      .catch(next);
  };

exports.getInvite = (req, res, next) => {
  if (!(res.locals.user === undefined)) {
    return res.render('error-forbidden')
  }

  User
    .findOne({ inviteToken: req.params.token })
    .where('inviteExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        req.flash('errors', { msg: 'Invitation token is invalid or has expired.' });
        return res.redirect('/');
      }
      res.render('account/reset', {
        title: 'Set Password'
      });
  });
};

exports.postInvite = (req, res) => {
  req.assert('password', 'Password must be at least 14 characters long').len(14);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  User
    .findOne({ inviteToken: req.params.token })
    .where('inviteExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Invitation token is invalid or has expired.' });
        return res.redirect('/');
      }
      user.password = req.body.password;
      user.joined = true;
      user.inviteAcceptedAt = Date.now();
      user.save((err) => {
        if (err) {
          return next(err);
        }
        req.flash('success', { msg: 'Profile created successfully.' });
        req.logIn(user, (err) => {
          if (err) { return next(err); }
          req.flash('success', { msg: 'Success! You are logged in.' });
          res.redirect('/account');
        });
      });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  const resetPassword = () =>
    User
      .findOne({ passwordResetToken: req.params.token })
      .where('passwordResetExpires').gt(Date.now())
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
          return res.redirect('back');
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        return user.save().then(() => new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) { return reject(err); }
            resolve(user);
          });
        }));
      });

  const sendResetPasswordEmail = (user) => {
    if (!user) { return; }
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'help@silentchoir.com',
      subject: 'Your password has been changed',
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', { msg: 'Success! Your password has been changed.' });
      })
      .catch((err) => {
        if (err.message === 'self signed certificate in certificate chain') {
          console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
          transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
              user: process.env.SENDGRID_USER,
              pass: process.env.SENDGRID_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('success', { msg: 'Success! Your password has been changed.' });
            });
        }
        console.log('ERROR: Could not send password reset confirmation email after security downgrade.\n', err);
        req.flash('warning', { msg: 'Your password has been changed, however we were unable to send you a confirmation email. We will be looking into it shortly.' });
        return err;
      });
  };

  resetPassword()
    .then(sendResetPasswordEmail)
    .then(() => { if (!res.finished) res.redirect('/'); })
    .catch(err => next(err));
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  const createRandomToken = randomBytesAsync(16)
    .then(buf => buf.toString('hex'));

  const setRandomToken = token =>
    User
      .findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Account with that email address does not exist.' });
        } else {
          user.passwordResetToken = token;
          user.passwordResetExpires = Date.now() + 3600000; // 1 hour
          user = user.save();
        }
        return user;
      });

  const sendForgotPasswordEmail = (user) => {
    if (!user) { return; }
    const token = user.passwordResetToken;
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'hackathon@starter.com',
      subject: 'Reset your password on Hackathon Starter',
      text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        http://${req.headers.host}/reset/${token}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('info', { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
      })
      .catch((err) => {
        if (err.message === 'self signed certificate in certificate chain') {
          console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
          transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
              user: process.env.SENDGRID_USER,
              pass: process.env.SENDGRID_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('info', { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
            });
        }
        console.log('ERROR: Could not send forgot password email after security downgrade.\n', err);
        req.flash('errors', { msg: 'Error sending the password reset message. Please try again shortly.' });
        return err;
      });
  };

  createRandomToken
    .then(setRandomToken)
    .then(sendForgotPasswordEmail)
    .then(() => res.redirect('/forgot'))
    .catch(next);
};
