const { SESSION_REDIS_KEY } = require('./constants');

module.exports = {
  sessionStarted: function(res, robot) {
    const session = robot.brain.get(SESSION_REDIS_KEY);
    if (!session) {
      res.send('Please start a Badminton session with `bb start`');
    }
    return Boolean(session);
  }
};
