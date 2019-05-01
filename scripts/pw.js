/**
 * {
 *   mattp: {
 *     password: 'horse'
 *   },
 *   jonchay: {
 *     password: 'cat'
 *   }
 * }
 */
const PLAYERS = 'sq-badminton-bot_players';

const ZODIAC = [
  'mouse',
  'ox',
  'tiger',
  'rabbit',
  'dragon',
  'snake',
  'horse',
  'goat',
  'monkey',
  'rooster',
  'dog',
  'pig',
  'cat'
];

module.exports = robot => {
  // bb pw mattp monkey
  robot.respond(/\s+pw\s+([a-zA-Z]+)\s+([a-zA-Z]+)/i, res => {
    const username = res.match[1].toLowerCase();
    const password = res.match[2].toLowerCase();

    if (username === 'remove') {
      return;
    }
    if (!ZODIAC.includes(password)) {
      res.send(`\`${password}\` isn't a Chinese zodiac animal, uh hello?`);
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
  robot.respond(/\s+pw$/i, res => {
    const players = robot.brain.get(PLAYERS);
    if (players && Object.keys(players).length > 0) {
      res.send("Let's see, I have the following players signed up:");
      for (let playerName in players) {
        const password = players[playerName].password;
        res.send(`\`${playerName}\` - \`${password}\`:${password}:`);
      }
    } else {
      res.send('Nobody has signed up yet Q_Q');
    }
  });

  // bb pw remove mattp
  robot.respond(/\s+pw\s+remove\s+([a-zA-Z]+)/i, res => {
    const username = res.match[1].toLowerCase();
    const players = robot.brain.get(PLAYERS);
    if (players) {
      if (players[username]) {
        delete players[username];
        res.send(`I will forget \`${username}\``);
        robot.brain.set(PLAYERS, players);
      } else {
        res.send(`Huh? Who is \`${username}\`?`);
      }
    }
  });
};
