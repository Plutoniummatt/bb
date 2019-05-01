module.exports = robot => {
  // bb ct
  robot.respond(/\s+(?:ct|court|crt)\s+(\d*)\s+([\w\d].*)/i, res => {
    const courtNumber = res.match[1]
    const args = res.match[2].split(' ').filter(Boolean);
    const delayTime = parseInt(args[args.length - 1]);

    if (!isNaN(delayTime)) {
      args.pop();
    }

    const lastPlayer = args.pop();
    const playerDescription = `\`${args.join(`\`, \``)}\` and \`${lastPlayer}\``;
    // Court 24 reserved with players “mattp” and “jonchay” starting in 42 minutes
    let courtDescription = `Court \`${courtNumber}\` reserved with players ${playerDescription}`;

    if (!isNaN(delayTime)) {
      courtDescription += ` starting in ${delayTime} minutes`
    }

    res.send(courtDescription);
  });
};
