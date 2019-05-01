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

// {
//   court_24: [{
//     players: playerNames,
//     randoms: true/false,
//     startAt: ....
//   },
//   ],
// }

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
    const courtNumber = res.match[1]
    const args = res.match[2].split(' ').filter(Boolean);
    const delayTime = parseInt(args[args.length - 1]);
    let expiringTimeDescription = '';

    if (!isNaN(delayTime)) {
      args.pop();
      expiringTimeDescription = ` starting in ${delayTime} minutes`;
    }

    if (args.length === 1) {
      res.send('You must sign up a court with more than one player');
      return;
    }

    const lastPlayer = args.pop();
    const playerDescription = `\`${args.join(`\`, \``)}\` and \`${lastPlayer}\``;
    // Court 24 reserved with players “mattp” and “jonchay” starting in 42 minutes
    let courtDescription = `Court \`${courtNumber}\` reserved with players ${playerDescription}`;

    addCourt(
      courtNumber,
      args,
      false,
      !isNaN(delayTime) ? delayTime : 0
    );

    const courts = getAllCourts();
    res.send(JSON.stringify(courts));

    res.send(`${courtDescription} ${expiringTimeDescription}`);
  });

  // bb ct|court|crt status
};
