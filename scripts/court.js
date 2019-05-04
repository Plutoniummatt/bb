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
//   *bab ct|court|crt* - Show status of all courts
//   *bab ct|court|crt <court_number> <name>.... <delay_time>* - Register the court number with the player names
//   *bab ct|court|crt <court_number> randoms <delay_time>* - Register the court number with randoms currently playing
//   *bab ct|court|crt pop <court_number>* - Remove the first item in the queue for the specified court
//   *bab ct|court|crt reset <court_number>* - Remove all queued groups from court number
//
// Notes:
//   <optional notes required for the script>

const moment = require("moment");
const { COURTS_REDIS_KEY, COURT_DURATION } = require('./common/constants');
const { sessionStarted, playerExists, getPlayerSignupStatuses, getAllCourts, setAllCourts } = require('./common/functions');
// by default 45 minutes is considered "in an hour", increase the threshold
moment.relativeTimeThreshold('m', 50);

function humanizePlayers(players) {
  const allPlayers = players.slice(0);
  const lastPlayer = allPlayers.pop();
  return `\`${allPlayers.join(`\`, \``)}\` and \`${lastPlayer}\``;
}

function humanizeCourtWithPlayers(courtNumber, players, randoms = false) {
  return randoms
    ? `Court \`${courtNumber}\` reserved with randoms`
    : `Court \`${courtNumber}\` reserved with players ${humanizePlayers(players)}`;
}

function parseMatches(matches) {
  const courtNumber = matches[1];
  const players = matches[2].split(' ').filter(Boolean).map(p => p.toLowerCase());
  const delayTime = matches[3];

  return {
    courtNumber,
    players,
    delayTime: isNaN(delayTime) ? null : delayTime
  }
}

function addCourt(robot, res, number, players, randoms = false, delayTime = 0) {
  if (players.length > 0) {
    if (players.length === 1) {
      res.reply(':x: You must sign up a court with more than one player');
      return;
    }

    if (players.length > 4) {
      res.reply(':x: You tried to sign up too many players');
      return;
    }

    const signupStatus = getPlayerSignupStatuses(robot);
    for (let player in players) {
      const playerName = players[player];
      if (!playerExists(playerName, robot)) {
        res.reply(`:x: Who is this \`${playerName}\` person?? did you forget to \`bab pw ${playerName} {password}\`?`);
        return;
      }
      if (signupStatus[playerName]) {
       res.reply(`:x: \`${playerName}\` is already signed up on Court ${signupStatus[playerName].split('_')[1]}`);
        return;
      }
    }
  }

  const courts = getAllCourts(robot);
  const courtKey = `court_${number}`;
  courts[courtKey] = courts[courtKey] || [];
  const existingQueue = courts[courtKey];
  const lastCourt = existingQueue[existingQueue.length - 1] || {};

  const postponeStart = lastCourt.startAt
    ? (COURT_DURATION + delayTime)
    : delayTime;

  const startAt = moment(lastCourt.startAt).add(postponeStart, 'minutes');

  const courtQueue = {
    players: randoms ? [] : players,
    randoms,
    startAt
  }

  courts[courtKey].push(courtQueue);
  setAllCourts(robot, courts);

  const courtDescription = humanizeCourtWithPlayers(number, players, courtQueue.randoms);
  const fromNowDescription = `starting ${moment(courtQueue.startAt).fromNow()}`;
  res.send(`:white_check_mark: ${courtDescription} ${fromNowDescription}`);
};

function removeCourt(robot, number) {
  const courtKey = `court_${number}`;
  const courts = getAllCourts(robot);

  if (courts[courtKey] === undefined) {
    return false;
  }
  delete courts[courtKey];
  setAllCourts(robot, courts);
  return true;
}

module.exports = robot => {
  // bab ct|court|crt <court_number> <names>... <delay_time>
  robot.respond(/\s+(?:ct|court|crt)\s+(\d+)\s+([\w\d\s]+)\s+(\d+)$/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }

    const {
      courtNumber,
      players,
      delayTime
    } = parseMatches(res.match);

    addCourt(
      robot,
      res,
      courtNumber,
      players,
      false,
      delayTime
    );
  });

  // bab ct|court|crt <court_number> <names>...
  robot.respond(/\s+(?:ct|court|crt)\s+(\d+)\s+([\w\d\s]+)$/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }

    const {
      courtNumber,
      players,
      delayTime
    } = parseMatches(res.match);

    addCourt(
      robot,
      res,
      courtNumber,
      players,
      false
    );
  });

  // bab ct|court|crt
  robot.respond(/\s+(?:ct|court|crt)$/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }
    const courts = getAllCourts(robot);
    let allCourtsDescription = '';

    for (const [courtKey, courtQueue] of Object.entries(courts)) {
      if (courtQueue.length === 0) {
        continue;
      }

      let playableRightNow;
      if (courtQueue[0].randoms) {
        playableRightNow = ':x:';
      } else {
        playableRightNow = moment().isAfter(courtQueue[0].startAt)
          ? ':white_check_mark:'
          : ':x:';
      }

      allCourtsDescription += `*Court ${courtKey.split('_')[1]}* ${playableRightNow}`;

      courtQueue.forEach(queue => {
        const timeDescription = moment().isAfter(queue.startAt)
          ? `now (expires ${moment(queue.startAt).add(COURT_DURATION, 'minutes').fromNow()})`
          : moment(queue.startAt).fromNow();

        const playingDescription = queue.randoms
          ? `playing *${timeDescription}* (Randoms)`
          : `playing *${timeDescription}* (${humanizePlayers(queue.players)})`;

        allCourtsDescription += `\n${playingDescription}`;
      });
      allCourtsDescription += `\n\n`;
    };

    if (allCourtsDescription === '') {
      allCourtsDescription += `\n\n*We have no courts! Sign up a court and add it via:*`;
      allCourtsDescription += `\n\`\`\`bab ct <court_number> <player_1> <player_2>...<delay_time>\`\`\``;
    }

    res.send(allCourtsDescription);
  });

  // bab ct|court|crt <court_number> pop
  robot.respond(/\s+(?:ct|court|crt)\s+pop\s+(\d+)$/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }
    const courtNumber = res.match[1];
    const courtKey = `court_${courtNumber}`;
    const courts = getAllCourts(robot);

    if (courts[courtKey]) {
      const removed = courts[courtKey].shift();
      const timeRemaining = moment(removed.startAt).add(COURT_DURATION, 'minutes').valueOf() - moment().valueOf();
      courts[courtKey].forEach(reservation => {
        reservation.startAt = moment(moment(reservation.startAt).valueOf() - timeRemaining);
      });
      setAllCourts(robot, courts);
      res.send(`:white_check_mark: I've popped the first session off the queue for court ${courtNumber}`);
    } else {
      res.send(`:x: Are you sure court ${courtNumber} is signed up?`);
    }
  });

  // bab ct|court|crt reset <court_number>
  robot.respond(/\s+(?:ct|court|crt)\s+(?:reset)\s+([\d]+)$/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }
    const courtNumber = res.match[1];
    removeCourt(robot, courtNumber)
      ? res.send(`Ok! I will forget everything about Court ${courtNumber}`)
      : res.send('Court does not exist, perhaps a different court?');
  });
};
