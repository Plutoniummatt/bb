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
const COURT_DURATION = 45; // minutes

function humanizeCourtWithPlayers(courtNumber, args) {
  const players = args.slice(0);
  const lastPlayer = players.pop();
  const playerDescription = `\`${players.join(`\`, \``)}\` and \`${lastPlayer}\``;
  // Court 24 reserved with players “mattp” and “jonchay” starting in 42 minutes
  return `Court \`${courtNumber}\` reserved with players ${playerDescription}`;
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

function setAllCourts(robot, court) {
  return robot.brain.set(COURTS_REDIS_KEY, court);
}


// group A 0
// group B 0 # 0 + 45 mins
// group C 45 # 45 + 45 mins

// group A 23
// group B 0 # 23 + 45

// group A 23
// group B 10 # 23 + 45 + 10

function addCourt(robot, number, players, randoms, delayTime = 0) {
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
    players,
    randoms,
    startAt
  }

  courts[courtKey].push(courtQueue);
  setAllCourts(robot, courts);
  return courtQueue;
};

module.exports = robot => {
  // bb ct|court|crt <court_number> <names>... <delay_time>
  robot.respond(/\s+(?:ct|court|crt)\s+(\d*)\s+([\w\d].*)/i, res => {
    const {
      courtNumber,
      players,
      delayTime
    } = parseMatches(res.match);

    if (players.length === 1) {
      res.send('You must sign up a court with more than one player');
      return;
    }

    const newCourt = addCourt(
      robot,
      courtNumber,
      players,
      false,
      delayTime
    );

    const courtDescription = humanizeCourtWithPlayers(courtNumber, players);
    const fromNowDescription = ` starting ${moment(newCourt.startAt).fromNow()}`;
    res.send(`${courtDescription} ${fromNowDescription}`);
  });

  // bb ct|court|crt status
  robot.respond(/\s+(?:ct|court|crt)\s+status$/i, res => {
    const courts = getAllCourts(robot);
    res.send(`Beep boop... gathering court status...`);
    res.send(`\`\`\`${JSON.stringify(courts, null, 2)}\`\`\``);
  });
};
