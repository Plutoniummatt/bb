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
module.exports = robot => {
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
    res.send(`${courtDescription} ${expiringTimeDescription}`);
  });

  // bb ct|court|crt status
};
