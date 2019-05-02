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
//   *bab ct|court|crt reset <court_number>* - Remove all queued groups from court number
//
// Notes:
//   <optional notes required for the script>

const moment = require("moment");
const { COURTS_REDIS_KEY } = require('./common/constants');
const { sessionStarted, playerExists, getPlayerSignupStatuses } = require('./common/functions');
const COURT_DURATION = 45; // minutes
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
  const players = matches[2].split(' ').filter(Boolean);
  const delayTime = parseInt(players[players.length - 1]);

  if (!isNaN(delayTime)) {
    players.pop();
  }

  return {
    courtNumber,
    players,
    delayTime: isNaN(delayTime) ? null : delayTime
  }
}

function getAllCourts(robot) {
  return robot.brain.get(COURTS_REDIS_KEY) || {};
};

function setAllCourts(robot, courts) {
  return robot.brain.set(COURTS_REDIS_KEY, courts);
}


function addCourt(robot, number, players, randoms = false, delayTime = 0) {
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
  return courtQueue;
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
  robot.respond(/\s+(?:ct|court|crt)\s+(\d+)\s+([\w\d].+)/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }
    const {
      courtNumber,
      players,
      delayTime
    } = parseMatches(res.match);

    if (players[0] !== 'randoms') {
      if (players.length === 1) {
        res.reply(':x: You must sign up a court with more than one player');
        return;
      }

      const signupStatus = getPlayerSignupStatuses(robot);
      for (let player in players) {
        const playerName = players[player];
        if (!playerExists(playerName, robot)) {
          res.reply(`:x: Who is this ${playerName} person?? did you forget to \`bab pw ${playerName} {password}\`?`);
          return;
        }
        if (signupStatus[playerName]) {
         res.reply(`:x: ${playerName} is already signed up on Court ${signupStatus[playerName].split('_')[1]}`);
          return;
        }
      }
    }

    const newCourt = addCourt(
      robot,
      courtNumber,
      players,
      players[0] === 'randoms',
      delayTime
    );

    const courtDescription = humanizeCourtWithPlayers(courtNumber, players, newCourt.randoms);
    const fromNowDescription = `starting ${moment(newCourt.startAt).fromNow()}`;
    res.send(`:white_check_mark: ${courtDescription} ${fromNowDescription}`);
  });

  // bab ct|court|crt status

  /**
   * :badminton_racquet_and_shuttlecock: Court Status:
    *Court 23*
    `winnie`, `goo` playing now
    Randoms playing in y minutes
    `foo`, `bar` playing in x minutes

    *Court 24*
    `mattp`, `jon` playing now
   */
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
          ? 'now'
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

    res.send(`Beep boop... gathering court status...`);
    res.send(allCourtsDescription);
  });

  robot.respond(/\s+(?:ct|court|crt)\s+(?:reset)\s+([\d]+)/i, res => {
    res.send('hello');
    const courtNumber = res.match[1];
    removeCourt(robot, courtNumber)
      ? res.send(`Ok! I will forget everything about Court ${courtNumber}`)
      : res.send('Court does not exist, perhaps a different court?');
  });
};
