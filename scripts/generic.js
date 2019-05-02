const moment = require("moment");
const { PLAYERS_REDIS_KEY, COURTS_REDIS_KEY, SESSION_REDIS_KEY } = require('./common/constants');

function reset(robot) {
  robot.brain.set(SESSION_REDIS_KEY, null);
  robot.brain.set(PLAYERS_REDIS_KEY, null);
  robot.brain.set(COURTS_REDIS_KEY, null);
  if (monitor) {
    clearInterval(monitor);
  }
}

let monitor;
function courtMonitor(robot) {
  // Every minute
  return setInterval(() => {
    periodicCourtTask(robot);
  }, 60 * 1000)
}

function periodicCourtTask(robot) {
  const courts = robot.brain.get(COURTS_REDIS_KEY);
  const players = robot.brain.get(PLAYERS_REDIS_KEY);

  if (courts && players) {
    let playerIds = new Set();
    for (let player in players) {
      playerIds.add(players[player].slackId);
    }
    let reminderMessage = `${Array.from(playerIds.values()).join(' ')}\n`;

    for (let court in courts) {
      const firstSession = courts[court][0];
      if (!courts[court].startNotificationSent && !firstSession.randoms) {
        if (moment().isAfter(moment(firstSession.startAt))) {
          reminderMessage = reminderMessage + `:white_check_mark: *Court ${court.split('_')[1]}* is ours!`;
          robot.messageRoom('#badminton-bot-tester', reminderMessage);
          courts[court].startNotificationSent = true;
        }
      }

      if (!courts[court].expiryNotificationSent && !firstSession.randoms) {
        if (moment().isAfter(moment(firstSession.startAt).add(40, 'minutes'))) {
          reminderMessage = reminderMessage + `:warning: One of our reservations for *Court ${court.split('_')[1]}* will expire in 5 minutes!`;
          robot.messageRoom('#badminton-bot-tester', reminderMessage);
          courts[court].expiryNotificationSent = true;
        }
      }

      if (moment().isAfter(moment(firstSession.startAt).add(44, 'minutes'))) {
        courts[court] = courts[court].slice(1);
      }

      robot.brain.set(COURTS_REDIS_KEY, courts);
    }
  }
}

module.exports = robot => {
  // bab start
  robot.respond(/\s+start$/i, res => {
    monitor = courtMonitor(robot);
    if (robot.brain.get(SESSION_REDIS_KEY)) {
      res.send("People are already playing! Get on with it.");
    } else {
      robot.brain.set(SESSION_REDIS_KEY, {
        startTime: moment()
      });
      res.send("Starting badminton session now. Enjoy!");
    }
  });

  // bab stop
  robot.respond(/\s+stop$/i, res => {
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
