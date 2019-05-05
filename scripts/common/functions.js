const { getSession } = require('./mongo');

module.exports = {
  sessionStarted: function(res, robot) {
    return getSession().then(session => {
      if (!session) {
        res.send('Please start a Badminton session with `bab start`');
      }

      return Boolean(session);
    });
  }
};
