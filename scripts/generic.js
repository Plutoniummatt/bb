const moment = require("moment");
const { PLAYERS_REDIS_KEY, COURTS_REDIS_KEY, SESSION_REDIS_KEY } = require('./common/constants');

function reset(robot) {
  robot.brain.set(SESSION_REDIS_KEY, null);
  robot.brain.set(PLAYERS_REDIS_KEY, null);
  robot.brain.set(COURTS_REDIS_KEY, null);
}

module.exports = robot => {
  // bb start
  robot.respond(/\s+start/i, res => {
    if (robot.brain.get(SESSION_REDIS_KEY)) {
      res.send("People are already playing! Get on with it.");
    } else {
      robot.brain.set(SESSION_REDIS_KEY, {
        startTime: moment()
      });
      res.send("Starting badminton session now. Enjoy!");
    }
  });

  // bb stop
  robot.respond(/\s+stop/i, res => {
    const session = robot.brain.get(SESSION_REDIS_KEY);
    if (session) {
      robot.brain.set(SESSION_REDIS_KEY, null);
      const timePlayed = moment.duration(moment() - session.startTime).humanize();
      reset(robot);
      res.send(`Ending badminton session. You’ve played for ${timePlayed}.`);
    } else {
      res.send("Can't stop what aint running, capn'");
    }
  });
};
