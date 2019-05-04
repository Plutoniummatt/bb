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
//   *bab pw* - Show all players and their passwords and play status
//   *bab pw <player_name> <password>* - Add player name and password to list
//   *bab pw remove <player_name>* - Remove player from list
//
// Notes:
//   <optional notes required for the script>

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
const { PLAYERS_REDIS_KEY, COURTS_REDIS_KEY } = require('./common/constants');
const { sessionStarted, playerExists, getPlayerSignupStatuses } = require('./common/functions');
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
  // bab pw mattp monkey
  robot.respond(/\s+pw\s+([a-zA-Z0-9]+)\s+([a-zA-Z]+)/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }

    const username = res.match[1].toLowerCase();
    const password = res.match[2].toLowerCase();

    if (username === 'remove') {
      return;
    }
    if (playerExists(username, robot)) {
      res.reply(`:x: \`${username}\` is already signed up, you can do \`bab pw remove ${username}\``);
      return;
    }
    if (!ZODIAC.includes(password)) {
      res.reply(`:x: \`${password}\` isn't a Chinese zodiac animal, uh hello?`);
      return;
    }


    const players = robot.brain.get(PLAYERS_REDIS_KEY);
    if (players) {
      players[username] = {
        password,
        slackId: `<@${res.envelope.user.id}>`
      };
    } else {
      robot.brain.set(PLAYERS_REDIS_KEY, {
        [username]: {
          password,
          slackId: `<@${res.envelope.user.id}>`
        }
      });
    }
    res.reply(`:white_check_mark: Hello! \`${username}\`, your password is \`${password}\`, I'll remember that, have fun!`);
  });

  // bab pw
  robot.respond(/\s+pw$/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }

    const players = robot.brain.get(PLAYERS_REDIS_KEY);
    if (players && Object.keys(players).length > 0) {
      const signedUpPlayers = getPlayerSignupStatuses(robot);

      let reply = "Let's see, I have the following players signed up:\n";
      let availablePlayersReply = '';
      let unavailablePlayersReply = '';
      for (let playerName in players) {
        const password = players[playerName].password;
        const signedUpCourt = signedUpPlayers[playerName];

        if (signedUpCourt) {
          unavailablePlayersReply = unavailablePlayersReply + `:x: (Court ${signedUpCourt.split('_')[1]}) \`${playerName}\` - \`${password}\``.padEnd(40) + '\n'
        } else {
          availablePlayersReply = availablePlayersReply + `:white_check_mark: (*Available*) \`${playerName}\` - \`${password}\``.padEnd(40) + '\n'
        }
      }
      res.send(reply + availablePlayersReply + unavailablePlayersReply);
    } else {
      res.send('Nobody has signed up yet Q_Q');
    }
  });

  // bab pw remove mattp
  robot.respond(/\s+pw\s+remove\s+([a-zA-Z0-9]+)/i, res => {
    if (!sessionStarted(res, robot)) {
      return;
    }

    const username = res.match[1].toLowerCase();
    const players = robot.brain.get(PLAYERS_REDIS_KEY);
    const playerSignups = getPlayerSignupStatuses(robot);

    if (playerSignups[username]) {
      res.reply(`:x: \`${username}\` is signed up on Court ${playerSignups[username].split('_')[1]}`);
      return;
    }

    if (players) {
      if (players[username]) {
        delete players[username];
        res.reply(`:white_check_mark: I will forget \`${username}\``);
        robot.brain.set(PLAYERS_REDIS_KEY, players);
      } else {
        res.reply(`:x: Huh? Who is \`${username}\`?`);
      }
    }
  });
};
