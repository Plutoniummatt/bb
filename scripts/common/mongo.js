const MongoClient = require('mongodb').MongoClient;
const moment = require("moment");

const BRAIN = 'brain';
const SESSIONS = 'sessions';
const PLAYERS = 'players';
const MEMBERS = 'members';
const RESERVATIONS = 'reservations';

let database;
module.exports = {
  connectToMongo: function(robot) {
    const mongoUrl = process.env.MONGODB_URL ||
                     process.env.MONGOLAB_URI ||
                     process.env.MONGOHQ_URL ||
                     'mongodb://localhost/hubot-brain';

    MongoClient.connect(mongoUrl, (err, db) => {
      robot.logger.info('MongoDB connected (Non-brain)');

      database = db;
      database.createCollection(SESSIONS);
      database.createCollection(MEMBERS);
      database.createCollection(PLAYERS);
      database.createCollection(RESERVATIONS);
    });
  },

  clearDatabase() {
    database.collection(BRAIN).deleteMany();
    database.collection(SESSIONS).deleteMany();
    database.collection(PLAYERS).deleteMany();
    database.collection(RESERVATIONS).deleteMany();
  },

  deleteMember: function(slackId) {
    return database.collection(MEMBERS).deleteOne({
      slackId
    });
  },

  newMember: function(slackId, playerName) {
    return database.collection(MEMBERS).insertOne({
      slackId,
      playerName
    });
  },

  getMembers: function(query) {
    return database.collection(MEMBERS).find(query);
  },

  getSession: function() {
    return database.collection(SESSIONS).findOne();
  },

  newSession: function() {
    return database.collection(SESSIONS).insertOne({
      startAt: moment().valueOf()
    });
  },

  newPlayer: function(name, password, slackId) {
    return database.collection(PLAYERS).insertOne({
      name,
      password,
      slackId
    });
  },

  getPlayers: function(query) {
    return database.collection(PLAYERS).find(query);
  },

  deletePlayer: function(name) {
    return database.collection(PLAYERS).deleteOne({
      name
    });
  },

  getReservations: function(query) {
    return database.collection(RESERVATIONS).find(query);
  },

  newReservation: function(courtNumber, players, startAt, randoms = false) {
    return database.collection(RESERVATIONS).insertOne({
      courtNumber: Number(courtNumber),
      players,
      startAt: moment(startAt).valueOf(),
      randoms: Boolean(randoms)
    });
  },

  deleteReservations: function(filter) {
    return database.collection(RESERVATIONS).deleteMany(filter);
  },

  updateReservations: function(filter, update) {
    return database.collection(RESERVATIONS).updateMany(filter, update);
  }
};
