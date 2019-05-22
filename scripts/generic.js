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
const {
  connectToMongo,
  newSession,
  getSession,
  clearDatabase,
  getReservations,
  updateReservations,
  getPlayers,
  deleteReservations,
  newReaction,
  deleteReaction,
  getReactions,
  resetReactions
} = require('./common/mongo');

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
        if (moment().isAfter(moment(firstReservation.startAt).add(COURT_DURATION - 1, 'minutes'))) {
          reservationsToDelete.push(firstReservation);
        }
      }

      deleteReservationsOrNot(reservationsToDelete);
    });
  });
}

module.exports = robot => {
  monitor = startCourtMonitor(robot);
  connectToMongo(robot);

  // bab hello
  robot.respond(/\s+hello$/i, res => {
    res.send('.\n:bab-1::bab-2::bab-3:\n:bab-4::bab-5::bab-6:\n:bab-7::bab-8::bab-9:');
  });

  // Listen to the Reminder message to count reactions
  robot.hear(/Reminder: @badminton-(tuesday|thursday|saturday|testday) react with/i, res => {
    resetReactions();
    const messageId = res.message.id;
    robot.hearReaction(res2 => {
      if (res2.message.item.ts === messageId) {
        if (res2.message.type === "added") {
          newReaction(res2.message.user.name);
        } else if (res2.message.type === "removed") {
          deleteReaction(res2.message.user.name);
        }
      }
    });
  });

  // bab who is playing
  robot.respond(/who is playing/i, res => {
    getReactions().toArray((err, reactions) => {
      let mentions = reactions.map(r => { return `@${r.slackName}` } );

      if (mentions.length === 0) {
        res.send(`Nobody is playing, wow so lonely :cry:`);
        return;
      }

      let counts = {};
      for (let i = 0; i < mentions.length; i++) {
        counts[mentions[i]] = 1 + (counts[mentions[i]] || 0);
      }

      uniq_mentions = [...new Set(mentions)].map(m => {
        if (counts[m] > 1) {
          return `${m} (+${counts[m] - 1})`;
        } else {
          return m;
        }
      });

      if (uniq_mentions.length === 1) {
        res.send(`${uniq_mentions[0]} is playing!`);
        return;
      }

      const lastMention = uniq_mentions.pop();

      res.send(`${uniq_mentions.join(', ')} and ${lastMention}, for a total of *${uniq_mentions.length + 1}* Squares! :dancingrobot:`);
    });
  });

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
