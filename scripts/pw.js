module.exports = robot => {
  // bb pw mattp monkey
  robot.respond(/\s+pw\s+([a-zA-Z]+)\s+([a-zA-Z]+)/, res => {
    const username = res.match[1];
    const password = res.match[2];
    res.send(username);
    res.send(password);
  });
};
