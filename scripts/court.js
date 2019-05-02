const moment = require("moment");

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

module.exports = robot => {
  function getAllCourts() {
    return robot.brain.get(COURTS_REDIS_KEY) || {};
  };

  function setAllCourts(court) {
    return robot.brain.set(COURTS_REDIS_KEY, court);
  }

  function addCourt(number, players, randoms, delayTime = 0) {
    const courts = getAllCourts();

    // startAt = moment().add(delayTime, 'minutes');
    startAt = moment().add(delayTime, 'minutes');
    courts[`court_${number}`] = courts[`court_${number}`] || [];
    courts[`court_${number}`].push({
      players,
      randoms,
      startAt,
    })

    setAllCourts(courts);
  };

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

    const courtDescription = humanizeCourtWithPlayers(courtNumber, players);
    const expiringTimeDescription = delayTime === null
      ? ''
      : ` starting in ${delayTime} minutes`;

    addCourt(
      courtNumber,
      players,
      false,
      delayTime
    );

    res.send(`${courtDescription} ${expiringTimeDescription}`);
  });

  // bb ct|court|crt status
  robot.respond(/\s+(?:ct|court|crt)\s+status$/i, res => {
    const courts = getAllCourts();
    res.send(`Beep boop... gathering court status...`);
    res.send(`\`\`\`${JSON.stringify(courts, null, 2)}\`\`\``);
  });
};
