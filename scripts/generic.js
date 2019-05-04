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
const { PLAYERS_REDIS_KEY, COURTS_REDIS_KEY, SESSION_REDIS_KEY, COURT_DURATION } = require('./common/constants');
const { getAllCourts, setAllCourts } = require('./common/functions');

function reset(robot) {
  robot.brain.set(SESSION_REDIS_KEY, null);
  robot.brain.set(PLAYERS_REDIS_KEY, null);
  robot.brain.set(COURTS_REDIS_KEY, null);
}

let monitor;
function startCourtMonitor(robot) {
  // Every minute
  return setInterval(() => {
    periodicCourtTask(robot);
  }, 60 * 1000)
}

function periodicCourtTask(robot) {
  const courts = getAllCourts(robot);
  const allPlayers = robot.brain.get(PLAYERS_REDIS_KEY);

  if (courts && allPlayers) {
    let playerIds = new Set();
    for (let player in allPlayers) {
      playerIds.add(allPlayers[player].slackId);
    }
    const players = `${Array.from(playerIds.values()).join(' ')}\n`;
    const newCourts = [];
    const expiringCourts = [];

    for (let court in courts) {
      const queue = courts[court];
      const firstSession = queue[0];

      if (!firstSession) {
        continue;
      }

      if (!firstSession.startNotificationSent && !firstSession.randoms) {
        if (moment().isAfter(moment(firstSession.startAt))) {
          newCourts.push(court.split('_')[1]);
          firstSession.startNotificationSent = true;
        }
      }

      if (!firstSession.expiryNotificationSent && !firstSession.randoms) {
        if (queue.length === 1 || queue[1].randoms) {
          if (moment().isAfter(moment(firstSession.startAt).add(COURT_DURATION - 5, 'minutes'))) {
            expiringCourts.push(court.split('_')[1]);
            firstSession.expiryNotificationSent = true;
          }
        }
      }

      if (moment().isAfter(moment(firstSession.startAt).add(COURT_DURATION - 1, 'minutes'))) {
        courts[court] = queue.slice(1);
      }
    }

    if (newCourts.length > 0 || expiringCourts.length > 0) {
      let message = players + '\n';
      if (newCourts.length > 0) {
        message = message + `:white_check_mark: We now have courts ${newCourts.join(',')}\n`;
      }
      if (expiringCourts.length > 0) {
        message = message + `:warning: Courts ${expiringCourts.join(',')} are expring in 5 minutes`;
      }
      robot.messageRoom('#badminton', message);
    }
    setAllCourts(robot, courts);
  }
}

module.exports = robot => {
  monitor = startCourtMonitor(robot);

  // bab start
  robot.respond(/\s+start$/i, res => {
    if (robot.brain.get(SESSION_REDIS_KEY)) {
      res.send("People are already playing! Get on with it.");
    } else {
      robot.brain.set(SESSION_REDIS_KEY, {
        startTime: moment().valueOf(),
        room: res.message.room
      });
      res.send("Starting badminton session now. Enjoy!");
    }
  });

  // bab stop
  robot.respond(/\s+stop$/i, res => {
    const session = robot.brain.get(SESSION_REDIS_KEY);
    if (session) {
      robot.brain.set(SESSION_REDIS_KEY, null);
      const timePlayed = moment.duration(moment() - moment(session.startTime)).humanize();
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
