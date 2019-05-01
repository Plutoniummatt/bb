module.exports = robot => {
  // bb ct
  robot.respond(/\s+ct|court|crt/, res => {
    res.send('COURT!?');
  });
};
