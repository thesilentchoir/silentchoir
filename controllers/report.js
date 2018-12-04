const Report = require('../models/Report.js');
const Room = require('../models/Room');

exports.getNewReport = (req, res) => {
  res.render('reports/new')
}

exports.createReport = (req, res) => {
  req.assert('alleged_party', 'Accused party cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('reports/new');
  }

  let alleged_party_check = req.body.alleged_party;

  let report = new Report(
    {
      alleged_party: req.body.alleged_party,
    }
  );

  function retrieveRoom(alleged_party_check, callback) {
  Room.find({alleged_party: alleged_party_check}, function(err, rooms) {
    if (err) {
      callback(err, null);
      } else {
      callback(null, rooms[0]);
      }
    });
  };

  retrieveRoom(alleged_party_check, function(err, room) {
    if (err) {
      console.log(err);
    }

    if (room === undefined) {
      let room = new Room(
        {
          alleged_party: alleged_party_check
        }
      )
      room.participants.push(req.user);
      room.save();
    } else {
      let participantsObject = room.participants;
      let participantStringsArray = participantsObject.map(id => JSON.stringify(id));

      let idCheck = JSON.stringify(req.user.id);

      if (!participantStringsArray.includes(idCheck)) {
        room.participants.push(req.user);
        room.save();
      }
    }
  });

  report.save(function (err) {
    if (err) {
      return next(err);
    }

    Report.find((err, docs) => {
      res.render('reports', { reports: docs });
    });
  });
}


exports.listReports = (req, res) => {
  Report.find((err, docs) => {
    res.render('reports', { reports: docs });
  });
};

exports.showReport = (req, res) => {
  Report.findById(req.params.reportId, (err, report) => {
    res.render('reports/show', { report: report });
  });
}

exports.getUpdateReport = (req, res) => {
  Report.findById(req.params.reportId, (err, report) => {
    res.render('reports/edit', { report: report });
  })
}

exports.putUpdateReport = (req, res) => {
  req.assert('alleged_party', 'Accused party cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('reports/edit');
  }

  Report.findById(req.params.reportId, (err, report) => {
    if (err) { return next(err); }
    report.alleged_party = req.body.alleged_party;
    report.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Username has been changed.' });
      res.redirect('/reports/:reportId');
    });
  });
}

exports.deleteReport = (req, res) => {
  Report.findByIdAndRemove(req.params.reportId)
  .then(report => {
    if (!report) {
      return res.status(404).send({
        message: "Report not found!"
      });
    }
    res.send({message: "Report deleted successfully."});
  }).catch(err => {
    if(err.kind === 'ObjectId' || err.name === 'NotFound') {
      return res.status(404).send({
        message: "Report not found: " + req.params.reportId
      });
    }
    return res.status(500).send({
      message: "Could not delete report: " + req.params.reportId
    });
  });
}
