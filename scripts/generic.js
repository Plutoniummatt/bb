module.exports = robot => {
  // bb start
  robot.respond(/\s+start/, res => {
    if (robot.brain.get('started')) {
      res.send("People are already playing! Get on with it.");
    } else {
      robot.brain.set('started', true);
      res.send("Starting badminton session now. Enjoy!");
    }
  });

  // bb stop
  robot.respond(/\s+stop/, res => {
    if (robot.brain.get('started')) {
      robot.brain.set('started', false);
      res.send("Ending badminton session. You’ve played X hours and Y mins.");
    } else {
      res.send("Can't stop what aint running, capn'");
    }
  });

  // bb help
  robot.respond(/\s+help/, res => {
    res.send("No help for you.");
  });
};
