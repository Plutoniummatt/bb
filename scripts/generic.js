// Description:
// <description of the scripts functionality>
//
// Dependencies:
// "<module name>": "<module version>"
//
// Configuration:
//   LIST_OF_ENV_VARS_TO_SET
//
// Commands:
//   *bab start* - Start the badminton session
//   *bab stop* - End the badminton session, it resets all courts and players
//
// Notes:
//   <optional notes required for the script>
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
          robot.messageRoom('#badminton', reminderMessage);
          courts[court].startNotificationSent = true;
        }
      }

      if (!courts[court].expiryNotificationSent && !firstSession.randoms) {
        if (moment().isAfter(moment(firstSession.startAt).add(40, 'minutes'))) {
          reminderMessage = reminderMessage + `:warning: One of our reservations for *Court ${court.split('_')[1]}* will expire in 5 minutes!`;
          robot.messageRoom('#badminton', reminderMessage);
          courts[court].expiryNotificationSent = true;
        }
      }

      if (moment().isAfter(moment(firstSession.startAt).add(44, 'minutes'))) {
        courts[court] = courts[court].slice(1);
      }
    }
    robot.brain.set(COURTS_REDIS_KEY, courts);
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

  robot.respond(/\sintro\s(.+)$/i, res => {
    const channelName = `#${res.match[1].toLowerCase()}`;
    const message1 = "Hello Square Badminton players! :waves: My name is `bab` (short for badminton bot), I'm here to help you keep track of passwords and court signups. This will be my first day on the job, so if you notice something that's not quite right, please notify @peck and @jonchay \n";
    const message2 = "To see what I can do, type `bab help`, I hope I can make your lives easier! :v:"
    robot.messageRoom(channelName, message1+message2);
  });
};
