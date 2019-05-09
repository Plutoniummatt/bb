const Helper = require('hubot-test-helper');
const helper = new Helper('../scripts/pw.js');
const moduleFor = require('qunit').module;
const test = require('qunit').test;
const sinon = require('sinon');
const MongoInterace = require('../scripts/common/mongo');

const getSessionStub = sinon.stub(MongoInterace, 'getSession').returns(Promise.resolve(false));

moduleFor('pw', function(hooks) {
  hooks.beforeEach(function() {
    this.room = helper.createRoom({ httpd: false });
  });

  hooks.afterEach(function() {
    this.room.destroy();
  });

  test('it should do something', function(assert) {
    this.room.user.say('jonchay', 'hubot pw jonchay monkey');
    assert.ok(true);
  });
});
