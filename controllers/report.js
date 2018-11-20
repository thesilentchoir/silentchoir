const Report = require('../models/Report.js');
const Room = require('../models/Room');

exports.listReports = (req, res) => {
  Report.find((err, docs) => {
    res.render('reports', { reports: docs });
  });
};

exports.getNewReport = (req, res) => {
  res.render('reports/new')
};

exports.postNewReport = (req, res) => {
  req.assert('username', 'Username cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('reports/new');
  }

  let alleged_party_check = req.body.alleged_party;

  let room = new Room(
    {
      alleged_party: alleged_party_check
    }
  );

  room.save();

  // let room_find = Room.find({ alleged_party: alleged_party_check });

  console.log(room);

  let report = new Report(
    {
      username: req.body.username,
      alleged_party: req.body.alleged_party,
      room: room._id
    }
  );

  report.save(function (err) {
    if (err) {
      return next(err);
    }
    Report.find((err, docs) => {
      res.render('reports', { reports: docs });
    });
  })
};

exports.showReport = (req, res) => {
  Report.findById(req.params.id, (err, report) => {
    res.render('reports/show', { report: report });
  })
}

exports.getUpdateReport = (req, res) => {
  Report.findById(req.params.id, (err, report) => {
    res.render('reports/edit', { report: report });
  })
}

exports.postUpdateReport = (req, res) => {
  req.assert('username', 'Username cannot be blank').notEmpty();
  req.assert('alleged_party', 'Accused party cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('reports/edit');
  }

  Report.findById(req.params.id, (err, report) => {
    if (err) { return next(err); }
    report.username = req.body.username;
    report.alleged_party = req.body.alleged_party;
    report.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Username has been changed.' });
      res.redirect('/reports/:id/edit');
    });
  });
}
