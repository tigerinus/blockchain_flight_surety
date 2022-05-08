
var Test = require('../config/testConfig.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
  });

  /****************************************************************************************/
  /* Airline registration                                                                 */
  /****************************************************************************************/

  it('1 - (airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

    // prerequisite check
    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredAirlineCount.toNumber(), 1, 'total number of airlines registered should be 1');

    // ARRANGE
    let airline2 = accounts[2];

    // ACT
    let exception = null;
    try {
      await config.flightSuretyApp.registerAirline(airline2, { from: accounts[1] });
    }
    catch (e) {
      exception = e;
    }

    // ASSERT
    assert.notEqual(exception, null, 'exception should be thrown');

    let result = await config.flightSuretyApp.isAirline.call(airline2);
    assert.equal(result, false, "account 1 should not be able to register airline 2 since it hasn't provided funding");
  });

  it('2 - (airline) can register an Airline using registerAirline() if it is funded', async () => {

    // prerequisite check
    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredAirlineCount.toNumber(), 1, 'total number of airlines registered should be 1');

    // fund
    await config.flightSuretyApp.sendTransaction({
      value: web3.utils.toWei('10', 'ether'),
      from: accounts[1]
    });

    // ARRANGE
    let airline2 = accounts[2];

    // ACT
    let transaction = await config.flightSuretyApp.registerAirline(airline2, { from: accounts[1] });

    // ASSERT
    assert.equal(transaction.logs[0].args.success, true, "airline registration should succeed");

    let airline2VoteCount = transaction.logs[0].args.votes;
    assert.equal(airline2VoteCount.toNumber(), 1, 'airline 2 should only have 1 vote so far');

    let result = await config.flightSuretyApp.isAirline.call(airline2);
    assert.equal(result, true, "airline2 should be registered");

    registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredAirlineCount.toNumber(), 2, 'total number of airlines registered should be 2');

    let hasAccount1Voted = await config.flightSuretyApp.hasAccountVoted.call(airline2, accounts[1]);
    assert.equal(hasAccount1Voted, true, 'account 1 should have voted for airline 2');
  });

  it('3 - (airline) cannot register an Airline without multipart consensus after 4 airlines already registered', async () => {

    // prerequisite check
    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredAirlineCount.toNumber(), 2, 'total number of airlines registered should be 2');

    // ARRANGE
    for (let i = 3; i <= 4; i++) {
      let newAirline = accounts[i];

      let result1 = await config.flightSuretyApp.isAirline.call(newAirline);
      assert.equal(result1, false, "Airline should not be registered yet");

      let hasAccountVoted1 = await config.flightSuretyApp.hasAccountVoted.call(newAirline, accounts[1]);
      assert.equal(hasAccountVoted1, false, 'account 1 should have not yet voted for airline ' + i);

      let airlineVoteCount1 = await config.flightSuretyApp.getAirlineVoteCount.call(newAirline);
      assert.equal(airlineVoteCount1.toNumber(), 0, 'airline ' + i + ' should no vote so far');

      // ACT
      let transaction1 = await config.flightSuretyApp.registerAirline(newAirline, { from: accounts[1] });

      // ASSERT
      assert.equal(transaction1.logs[0].args.success, true, "airline registration should succeed");

      airlineVoteCount1 = transaction1.logs[0].args.votes;
      assert.equal(airlineVoteCount1.toNumber(), 1, 'airline ' + i + ' should 1 vote');

      result1 = await config.flightSuretyApp.isAirline.call(newAirline);
      assert.equal(result1, true, "Airline should be registered");

      hasAccountVoted1 = await config.flightSuretyApp.hasAccountVoted.call(newAirline, accounts[1]);
      assert.equal(hasAccountVoted1, true, 'account 1 should have voted for airline ' + i);
    }

    // ASSERT
    registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(4, registeredAirlineCount, 'Total number of airlines registered should be 4');

    let airline5 = accounts[5];

    // ACT
    let transaction2 = await config.flightSuretyApp.registerAirline(airline5, { from: accounts[1] });

    // ASSERT
    assert.equal(transaction2.logs[0].args.success, false, "airline registration should not succeed");

    let airlineVoteCount2 = transaction2.logs[0].args.votes;
    assert.equal(airlineVoteCount2.toNumber(), 1, 'airline 5 should 1 vote');

    let result2 = await config.flightSuretyApp.isAirline.call(airline5);
    assert.equal(result2, false, "airline 5 should not be registered");

    let hasAccountVoted2 = await config.flightSuretyApp.hasAccountVoted.call(airline5, accounts[1]);
    assert.equal(hasAccountVoted2, true, 'account 1 should have voted for airline 5');

    registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(4, registeredAirlineCount, 'Total number of airlines registered should still be 4');
  });

  it('4 - (airline) can register an Airline with multipart consensus after 4 airlines already registered', async () => {
    // prerequisite check
    let registeredAirlineCount1 = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredAirlineCount1.toNumber(), 4, 'total number of airlines registered should be 4');

    // fund
    [2, 3].forEach(async (i) => {
      await config.flightSuretyApp.sendTransaction({
        value: web3.utils.toWei('10', 'ether'),
        from: accounts[i]
      });
    });

    // ARRANGE
    let airline5 = accounts[5];

    // prerequisite check
    let isAirline5Registered = await config.flightSuretyApp.isAirline.call(airline5);
    assert.equal(isAirline5Registered, false, "airline 5 should not be registered");

    let airline5VoteCount = await config.flightSuretyApp.getAirlineVoteCount.call(airline5);
    assert.equal(airline5VoteCount.toNumber(), 1, 'airline 5 should only have 1 vote so far from previous test');

    let hasAccount2Voted = await config.flightSuretyApp.hasAccountVoted.call(airline5, accounts[2]);
    assert.equal(hasAccount2Voted, false, 'account 2 should have not voted for airline 5 yet');

    // let account2 vote for airline 5 by trying to register 
    try {
      await config.flightSuretyApp.registerAirline(airline5, { from: accounts[2] });
    }
    catch (e) {
      console.log(e);
    }

    // ASSERT
    let result1 = await config.flightSuretyApp.isAirline.call(airline5);
    assert.equal(result1, false, "airline 5 should not be registered because it has got only 2 consensus so far.");

    hasAccount2Voted = await config.flightSuretyApp.hasAccountVoted.call(airline5, accounts[2]);
    assert.equal(hasAccount2Voted, true, 'account 2 should have voted for airline 5 by now');

    airline5VoteCount = await config.flightSuretyApp.getAirlineVoteCount.call(airline5);
    assert.equal(airline5VoteCount.toNumber(), 2, 'Airline 5 should have 2 votes');

    let registeredAirlineCount2 = await config.flightSuretyApp.getRegisteredAirlineCount.call();

    assert.equal(registeredAirlineCount1.toNumber(), registeredAirlineCount2.toNumber(), 'register airline count should stay the same');

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(airline5, { from: accounts[3] });
    }
    catch (e) {

    }
    let result2 = await config.flightSuretyApp.isAirline.call(airline5);
    // ASSERT
    assert.equal(result2, true, "Airline should be registered because it has got 3 consensus so far which is more than half of 4 registered airlines.");
  });


  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`5 - (multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`6 - (multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyApp.setOperatingStatus(false, { from: config.testAddresses[2] });
    }
    catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

  });

  it(`7 - (multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyApp.setOperatingStatus(false);
    }
    catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

  });
});
