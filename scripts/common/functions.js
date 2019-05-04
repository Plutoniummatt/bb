const moment = require("moment");
const { SESSION_REDIS_KEY, PLAYERS_REDIS_KEY, COURTS_REDIS_KEY } = require('./constants');

module.exports = {
  sessionStarted: function(res, robot) {
    const session = robot.brain.get(SESSION_REDIS_KEY);
    if (!session) {
      res.send('Please start a Badminton session with `bab start`');
    }
    return Boolean(session);
  },

  playerExists: function(playerName, robot) {
    const players = robot.brain.get(PLAYERS_REDIS_KEY);
    if (players) {
      return Boolean(players[playerName]);
    }
    return false;
  },

  getPlayerSignupStatuses: function(robot) {
    const courts = robot.brain.get(COURTS_REDIS_KEY);
    if (courts) {
      playerStatuses = {};
      for (let court in courts) {
        courts[court].forEach(reservation => {
          reservation.players.forEach(player => {
            playerStatuses[player] = court;
          });
        });
      }
      return playerStatuses;
    } else {
      return {};
    }
  },

  getAllCourts: function(robot) {
    const courts = robot.brain.get(COURTS_REDIS_KEY);
    for (let court in courts) {
      courts[court].forEach(signup => {
        signup.startAt = moment(signup.startAt);
      });
    }
    return courts || {};
  },

  setAllCourts: function(robot, courts) {
    for (let court in courts) {
      courts[court].forEach(signup => {
        signup.startAt = signup.startAt.valueOf();
      });
    }
    return robot.brain.set(COURTS_REDIS_KEY, courts);
  }
};
