const PLAYERS = 'sq-badminton-bot_players';

module.exports = robot => {
  // bb pw mattp monkey
  robot.respond(/\s+pw\s+([a-zA-Z]+)\s+([a-zA-Z]+)/, res => {
    const username = res.match[1];
    const password = res.match[2];

    if (username === 'remove') {
      return;
    }

    const players = robot.brain.get(PLAYERS);
    if (players) {
      players[username] = { password };
    } else {
      robot.brain.set(PLAYERS, {
        [username]: {
          password
        }
      });
    }

    res.send(`Hello! \`${username}\`, your password is \`${password}\`, I'll remember that, have fun!`);
  });

  // bb pw
  robot.respond(/\s+pw$/, res => {
    const players = robot.brain.get(PLAYERS);
    if (players && Object.keys(players).length > 0) {
      for (let playerName in players) {
        res.send("Let's see, I have the following players signed up:");
        const password = players[playerName].password;
        res.send(`\`${playerName}\` - \`${password}\`:${password}:`);
      }
    } else {
      res.send('Nobody has signed up yet `Q_Q`');
    }
  });

  // bb pw remove mattp
  robot.respond(/\s+pw\s+remove\s+([a-zA-Z]+)/, res => {
    const username = res.match[1];
    const players = robot.brain.get(PLAYERS);
    if (players) {
      delete players[username];
      res.send(`I will forget \`${username}\``);
      robot.brain.set(PLAYERS, players);
    }
  });
};
