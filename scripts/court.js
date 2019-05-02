const moment = require("moment");
// by default 45 minutes is considered "in an hour", increase the threshold
moment.relativeTimeThreshold('m', 50);

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
//   bb ct|court|crt <court_number> <name>.... <delay_time> - Register the court number with the player names
//
// Notes:
//   <optional notes required for the script>

const { COURTS_REDIS_KEY } = require('./common/constants');
const { sessionStarted, playerExists } = require('./common/functions');
const COURT_DURATION = 45; // minutes

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
  // bb ct|court|crt <court_number> <names>... <delay_time>
  robot.respond(/\s+(?:ct|court|crt)\s+(\d*)\s+([\w\d].*)/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }
    const {
      courtNumber,
      players,
      delayTime
    } = parseMatches(res.match);

    for (let player in players) {
      if (!playerExists(player, robot)) {
        res.reply(`:x: Who is this ${player} person?? did you forget to \`bb pw ${player} {password}\`?`);
        return;
      }
    }

    if (players.length === 1 && players[0] !== 'randoms') {
      res.reply(':x: You must sign up a court with more than one player');
      return;
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
    res.send(`${courtDescription} ${fromNowDescription}`);
  });

  // bb ct|court|crt status

  /**
   * :badminton_racquet_and_shuttlecock: Court Status:
    *Court 23*
    `winnie`, `goo` playing now
    Randoms playing in y minutes
    `foo`, `bar` playing in x minutes

    *Court 24*
    `mattp`, `jon` playing now
   */
  robot.respond(/\s+(?:ct|court|crt)\s+status$/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }
    const courts = getAllCourts(robot);
    let allCourtsDescription = ':badminton_racquet_and_shuttlecock: *Court Status:*';

    for (const [courtKey, courtQueue] of Object.entries(courts)) {
      if (courtQueue.length === 1 && courtQueue[0].randoms) {
        continue;
      }

      allCourtsDescription += `\n*Court ${courtKey.split('_')[1]}*`;

      courtQueue.forEach(queue => {
        const timeDescription = moment().isAfter(queue.startAt)
          ? 'now'
          : moment(queue.startAt).fromNow();

        const playingDescription = queue.randoms
          ? `Randoms playing ${timeDescription}`
          : `${humanizePlayers(queue.players)} playing ${timeDescription}`;

        allCourtsDescription += `\n${playingDescription}`;
      });
      allCourtsDescription += `\n\n`;
    };

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
