module.exports = robot => {
  // bb start
  robot.respond(/\s+start/i, res => {
    if (robot.brain.get('started')) {
      res.send("People are already playing! Get on with it. - jonchay");
    } else {
      robot.brain.set('started', true);
      res.send("Starting badminton session now. Enjoy!");
    }
  });

  // bb stop
  robot.respond(/\s+stop/i, res => {
    if (robot.brain.get('started')) {
      robot.brain.set('started', false);
      res.send("Ending badminton session. You’ve played X hours and Y mins.");
    } else {
      res.send("Can't stop what aint running, capn'");
    }
  });

  robot.respond(/\s+reset/i, res => {
    robot.brain.set('sq-badminton-bot_players', null);
    robot.brain.set('sq-badminton-bot_COURTS', null);
  });
};
