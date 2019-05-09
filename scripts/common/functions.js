const { getSession } = require('./mongo');

module.exports = {
  sessionStarted: function(res, robot) {
    return getSession().then(session => {
      if (!session) {
        console.log('have not started');
        res.send('Please start a Badminton session with `bab start`');
      }

      return Boolean(session);
    });
  }
};
