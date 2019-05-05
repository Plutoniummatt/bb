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
//   *bab ct|court|crt* - Show status of all courts
//   *bab ct|court|crt <court_number> <name>.... <delay_time>* - Register the court number with the player names
//   *bab ct|court|crt <court_number> randoms <delay_time>* - Register the court number with randoms currently playing
//   *bab ct|court|crt pop <court_number>* - Remove the first item in the queue for the specified court
//   *bab ct|court|crt reset <court_number>* - Remove all queued groups from court number
//
// Notes:
//   <optional notes required for the script>

const moment = require("moment");
const { COURT_DURATION } = require('./common/constants');
const { sessionStarted } = require('./common/functions');
const { getReservations, newReservation, deleteReservations, updateReservations, getPlayers } = require('./common/mongo');

function humanizePlayers(players) {
  const allPlayers = players.slice(0);
  const lastPlayer = allPlayers.pop();
  return `\`${allPlayers.join(`\`, \``)}\` and \`${lastPlayer}\``;
}

function humanizeCourtWithPlayers(courtNumber, players, randoms = false) {
  return randoms
    ? `Court \`${courtNumber}\` reserved with randoms`
    : `Court \`${courtNumber}\` reserved with players ${humanizePlayers(players)}`;
}

function parseMatches(matches) {
  const courtNumber = matches[1];
  const players = matches[2].split(' ').filter(Boolean).map(p => p.toLowerCase());
  const delayTime = matches[3];

  return {
    courtNumber,
    players,
    delayTime: isNaN(delayTime) ? null : delayTime
  }
}

function addCourt(robot, res, number, players, randoms = false, delayTime = 0) {
  if (players.length > 0 || randoms) {
    if (players.length === 1) {
      res.reply(':x: You must sign up a court with more than one player');
      return;
    }

    if (players.length > 4) {
      res.reply(':x: You tried to sign up too many players');
      return;
    }

    getReservations().toArray((err, reservations) => {
      getPlayers().toArray((err, existingPlayers) => {
        let skip = false;
        if (!randoms) {
          players.forEach(player => {
            if (!existingPlayers.map(p => p.name).includes(player)) {
              res.reply(`:x: Who is this \`${player}\` person?? did you forget to \`bab pw ${player} {password}\`?`);
              skip = true;
            }
          });

          reservations.forEach(reservation => {
            reservation.players.forEach(player => {
              if (players.includes(player)) {
                res.reply(`:x: \`${player}\` is already signed up on Court ${reservation.courtNumber}`);
                skip = true;
              }
            });
          });
        }

        if (!skip) {
          getReservations({
            courtNumber: Number(number)
          }).sort({ startAt: 1 }).toArray((err, reservations) => {
            let postponeStart = Number(delayTime);
            let startAt = moment().add(postponeStart, 'minutes');

            if (reservations.length > 0) {
              postponeStart = Number(delayTime) + COURT_DURATION;
              startAt = moment(reservations.pop().startAt).add(postponeStart, 'minutes');
            }

            newReservation(
              number,
              randoms
                ? []
                : players,
              startAt.valueOf(),
              randoms
            );

            const courtDescription = humanizeCourtWithPlayers(number, players, randoms);
            const fromNowDescription = `starting ${moment(startAt).fromNow()}`;
            res.send(`:white_check_mark: ${courtDescription} ${fromNowDescription}`);
          });
        }
      });
    });
  }
};

module.exports = robot => {
  // by default 45 minutes is considered "in an hour", increase the threshold
  moment.relativeTimeThreshold('m', 50);

  // bab ct|court|crt <court_number> <names>... <delay_time>
  robot.respond(/\s+(?:ct|court|crt)\s+(\d+)\s+([\w\d\s]+)\s+([\d\-]+)$/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        const {
          courtNumber,
          players,
          delayTime
        } = parseMatches(res.match);

        if (!players.includes('randoms')) {
          addCourt(
            robot,
            res,
            courtNumber,
            players,
            false,
            delayTime
          );
        }
      }
    });
  });

  // bab ct|court|crt <court_number> <names>...
  robot.respond(/\s+(?:ct|court|crt)\s+(\d+)\s+([\w\d\s]+)$/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        const {
          courtNumber,
          players,
          delayTime
        } = parseMatches(res.match);

        if (!players.includes('randoms')) {
          addCourt(
            robot,
            res,
            courtNumber,
            players,
            false
          );
        }
      }
    });
  });

  // bab ct|court|crt <court_number> randoms <delay_time>
  robot.respond(/\s+(?:ct|court|crt)\s+(\d+)\s+randoms\s+([\d\-]+)$/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        const courtNumber = res.match[1];
        const delayTime = res.match[2];

        addCourt(
          robot,
          res,
          courtNumber,
          [],
          true,
          Number(delayTime)
        );
      }
    });
  });

  // bab ct|court|crt <court_number> randoms
  robot.respond(/\s+(?:ct|court|crt)\s+(\d+)\s+randoms$/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        const courtNumber = res.match[1];

        addCourt(
          robot,
          res,
          courtNumber,
          [],
          true
        );
      }
    });
  });

  // bab ct|court|crt
  robot.respond(/\s+(?:ct|court|crt)$/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        const reservationsByCourtNumber = {};
        getReservations().sort({ startAt: 1 }).toArray((err, reservations) => {
          reservations.forEach(reservation => {
            if (reservationsByCourtNumber[reservation.courtNumber]) {
              reservationsByCourtNumber[reservation.courtNumber].push(reservation);
            } else {
              reservationsByCourtNumber[reservation.courtNumber] = [reservation];
            }
          });

          let allCourtsDescription = '';
          for (const [courtNumber, reservations] of Object.entries(reservationsByCourtNumber)) {
            const playableRightNow = !reservations[0].randoms;
            allCourtsDescription += `\n*Court ${courtNumber}* ${playableRightNow ? ':white_check_mark:' : ':x:'}`;
            reservations.forEach(reservation => {
              const timeDescription = moment().isAfter(reservation.startAt)
                ? `now (expires ${moment(reservation.startAt).add(COURT_DURATION, 'minutes').fromNow()})`
                : moment(reservation.startAt).fromNow();

              const playingDescription = reservation.randoms
                ? `playing *${timeDescription}* (Randoms)`
                : `playing *${timeDescription}* (${humanizePlayers(reservation.players)})`;

              allCourtsDescription += `\n${playingDescription}`;
            });
          }

          if (allCourtsDescription === '') {
            allCourtsDescription += `\n\n*We have no courts! Sign up a court and add it via:*`;
            allCourtsDescription += `\n\`\`\`bab ct <court_number> <player_1> <player_2>...<delay_time>\`\`\``;
          }

          res.send(allCourtsDescription);
        });
      }
    });
  });

  // bab ct|court|crt pop <court_number>
  robot.respond(/\s+(?:ct|court|crt)\s+pop\s+(\d+)$/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        const courtNumber = res.match[1];
        getReservations({ courtNumber: Number(courtNumber) }).sort({ startAt: 1 }).toArray((err, reservations) => {
          if (reservations.length > 0) {
            const timeLeft = moment(reservations[0].startAt).add(COURT_DURATION, 'minutes').valueOf() - moment().valueOf();
            deleteReservations({ _id: reservations[0]._id }).then(result => {
              reservations.shift();
              reservations.forEach(reservation => {
                updateReservations({ _id: reservation._id }, {
                  $set: {
                    startAt: reservation.startAt - timeLeft
                  }
                });
              });
              res.send(`:white_check_mark: I've popped the first session off the queue for court ${courtNumber}`);
            });
          } else {
            res.send(`:x: Are you sure court ${courtNumber} is signed up?`);
          }
        });
      }
    })
  });

  // bab ct|court|crt reset <court_number>
  robot.respond(/\s+(?:ct|court|crt)\s+(?:reset)\s+([\d]+)$/i, res => {
    sessionStarted(res).then(started => {
      if (started) {
        const courtNumber = res.match[1];
        deleteReservations({
          courtNumber: Number(courtNumber)
        }).then(result => {
          res.send(`:white_check_mark: Ok! I will forget everything about Court ${courtNumber}`);
        });
      }
    });
  });
};
