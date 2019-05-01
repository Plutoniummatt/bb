module.exports = robot => {
  // bb start
  robot.respond(/\s+start/, res => {
    res.send("Starting badminton session now. Enjoy!");
  });

  // bb stop
  robot.respond(/\s+stop/, res => {
    res.send("Ending badminton session. You’ve played X hours and Y mins.");
  });

  // bb help
  robot.respond(/\s+help/, res => {
    res.send("No help for you.");
  });
};
