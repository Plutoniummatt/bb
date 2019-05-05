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
const { sessionStarted } = require('./common/functions');
const { newPlayer, deletePlayer, getPlayers, getReservations } = require('./common/mongo');
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
    sessionStarted(res).then(started => {
      if (started) {
        const username = res.match[1].toLowerCase();
        const password = res.match[2].toLowerCase();

        if (username === 'remove') {
          return;
        }

        if (!ZODIAC.includes(password)) {
          res.reply(`:x: \`${password}\` isn't a Chinese zodiac animal, uh hello?`);
          return;
        }

        getPlayers({ name: username }).toArray((err, players) => {
          if (players.length === 0) {
            newPlayer(username, password, `<@${res.envelope.user.id}>`).then(() => {
              res.reply(`:white_check_mark: Hello! \`${username}\`, your password is \`${password}\`, I'll remember that, have fun!`);
            });
          } else {
            res.reply(`:x: \`${username}\` is already signed up, you can do \`bab pw remove ${username}\``);
          }
        });
      }
    });
  });

  // bab pw
  robot.respond(/\s+pw$/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        getPlayers().toArray((err, players) => {
          if (players.length > 0) {
            let reply = "Let's see, I have the following players signed up:\n";
            let availablePlayersReply = '';
            let unavailablePlayersReply = '';
            getReservations().toArray((err, reservations) => {
              const signedUpPlayers = {};
              reservations.forEach(reservation => {
                reservation.players.forEach(signedUpPlayer => {
                  signedUpPlayers[signedUpPlayer] = reservation.courtNumber;
                });
              });

              players.forEach(player => {
                const password = player.password;
                const playerName = player.name;
                const signedUpCourt = signedUpPlayers[playerName];

                if (signedUpCourt) {
                  unavailablePlayersReply = unavailablePlayersReply + `:x: (Court ${signedUpCourt}) \`${playerName}\` - \`${password}\``.padEnd(40) + '\n'
                } else {
                  availablePlayersReply = availablePlayersReply + `:white_check_mark: (*Available*) \`${playerName}\` - \`${password}\``.padEnd(40) + '\n'
                }
              });

              res.send(reply + availablePlayersReply + unavailablePlayersReply);
            });
          } else {
            res.send('Nobody has signed up yet Q_Q');
          }
        });
      }
    });
  });

  // bab pw remove mattp
  robot.respond(/\s+pw\s+remove\s+([a-zA-Z0-9]+)/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        const username = res.match[1].toLowerCase();
        getReservations().toArray((err, reservations) => {
          const signedUpPlayers = {};
          reservations.forEach(reservation => {
            reservation.players.forEach(signedUpPlayer => {
              signedUpPlayers[signedUpPlayer] = reservation.courtNumber;
            });
          });

          if (signedUpPlayers[username]) {
            res.reply(`:x: \`${username}\` is signed up on Court ${playerSignups[username].split('_')[1]}`);
            return;
          }

          deletePlayer(username).then(() => {
            res.reply(`:white_check_mark: I will forget \`${username}\``);
          });
        });
      }
    });
  });
};
