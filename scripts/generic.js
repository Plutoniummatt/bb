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
//   *bab start* - Start the badminton session
//   *bab stop* - End the badminton session, it resets all courts and players
//
// Notes:
//   <optional notes required for the script>
const moment = require("moment");
const { COURT_DURATION } = require('./common/constants');
const { connectToMongo, newSession, getSession, clearDatabase, getReservations, updateReservations, getPlayers, deleteReservations } = require('./common/mongo');

function reset(robot) {
  clearDatabase();
}

let monitor;
function startCourtMonitor(robot) {
  // Every minute
  return setInterval(() => {
    periodicCourtTask(robot);
  }, 60 * 1000)
}

function deleteReservationsOrNot(toDelete) {
  if (toDelete.length === 0) {
    return new Promise(resolve => {
      resolve();
    });
  } else {
    return deleteReservations({
      _id: {
        $in: toDelete.map(each => each._id)
      }
    });
  }
}

function updateReservationsOrNot(toUpdate, update) {
  if (toUpdate.length === 0) {
    return new Promise(resolve => {
      resolve();
    });
  } else {
    return updateReservations({
      _id: {
        $in: toUpdate.map(each => each._id)
      }
    }, update);
  }
}

function periodicCourtTask(robot) {
  getPlayers().toArray((err, players) => {
    const slackIds = new Set(players.map(player => player.slackId));
    const newReservations = [];
    const expiringReservations = [];
    const reservationsToDelete = [];

    getReservations().sort({ startAt: 1 }).toArray((err, reservations) => {
      const reservationsByCourt = {};
      reservations.forEach(reservation => {
        if (reservationsByCourt[reservation.courtNumber]) {
          reservationsByCourt[reservation.courtNumber].push(reservation);
        } else {
          reservationsByCourt[reservation.courtNumber] = [reservation];
        }
      });

      for (let courtNumber in reservationsByCourt) {
        const reservationsForCourt = reservationsByCourt[courtNumber];
        const firstReservation = reservationsForCourt[0];
        if (!firstReservation.startNotificationSent && !firstReservation.randoms) {
          if (moment().isAfter(moment(firstReservation.startAt))) {
            newReservations.push(firstReservation);
          }
        }
        if (!firstReservation.expiryNotificationSent && !firstReservation.randoms) {
          if (reservationsForCourt.length === 1 || reservationsForCourt[1].randoms) {
            if (moment().isAfter(moment(firstReservation.startAt).add(COURT_DURATION - 5, 'minutes'))) {
              expiringReservations.push(firstReservation);
            }
          }
        }
        if (moment().isAfter(moment(firstReservation.startAt).add(COURT_DURATION - 1, 'minutes'))) {
          reservationsToDelete.push(firstReservation);
        }
      }

      deleteReservationsOrNot(reservationsToDelete).then(() => {
        updateReservationsOrNot(newReservations, { $set: { startNotificationSent: true }}).then(() => {
          updateReservationsOrNot(expiringReservations, { $set: { expiryNotificationSent: true }}).then(() => {
            if (expiringReservations.length > 0) {
              let message = Array.from(slackIds) + '\n';
              if (expiringReservations.length > 0) {
                message = message + `:warning: Courts *(${expiringReservations.map(each => each.courtNumber).join(',')})* are expring in 5 minutes`;
              }
              robot.messageRoom('#badminton', message);
            }
          });
        });
      });
    });
  });
}

module.exports = robot => {
  monitor = startCourtMonitor(robot);
  connectToMongo(robot);

  // bab stop
  robot.respond(/\s+secretcommand\s+([a-zA-Z\-]+)\s+(.*)$/i, res => {
    const room = res.match[1].toLowerCase();
    const message = res.match[2].toLowerCase();
    robot.messageRoom(`#${room}`, message);
  });

  // bab start
  robot.respond(/\s+start$/i, res => {
    getSession().then(session => {
      if (session) {
        res.send("People are already playing! Get on with it.");
      } else {
        newSession().then(() => {
          res.send("Starting badminton session now. Enjoy!");
        });
      }
    });
  });

  // bab stop
  robot.respond(/\s+stop$/i, res => {
    getSession().then(session => {
      if (session) {
        const timePlayed = moment.duration(moment() - moment(session.startAt)).humanize();
        reset(robot);
        res.send(`Ending badminton session. You’ve played for ${timePlayed}.`);
      } else {
        res.send("Can't stop what aint running, capn'");
      }
    });
  });
};
