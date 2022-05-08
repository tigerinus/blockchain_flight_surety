
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
    let registeredCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredCount.toNumber(), 1, 'total number of airlines registered should be 1');

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
    let registeredCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredCount.toNumber(), 1, 'total number of airlines registered should be 1');

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

    let votes = transaction.logs[0].args.votes;
    assert.equal(votes.toNumber(), 1, 'airline 2 should only have 1 vote so far');

    let result = await config.flightSuretyApp.isAirline.call(airline2);
    assert.equal(result, true, "airline2 should be registered");

    registeredCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredCount.toNumber(), 2, 'total number of airlines registered should be 2');

    let voted = await config.flightSuretyApp.hasAccountVoted.call(airline2, accounts[1]);
    assert.equal(voted, true, 'account 1 should have voted for airline 2');
  });

  it('3 - (airline) cannot register an Airline without multipart consensus after 4 airlines already registered', async () => {

    // prerequisite check
    let registeredCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredCount.toNumber(), 2, 'total number of airlines registered should be 2');

    // ARRANGE
    for (let i = 3; i <= 4; i++) {
      let airline = accounts[i];

      let result1 = await config.flightSuretyApp.isAirline.call(airline);
      assert.equal(result1, false, "Airline should not be registered yet");

      let voted1 = await config.flightSuretyApp.hasAccountVoted.call(airline, accounts[1]);
      assert.equal(voted1, false, 'account 1 should have not yet voted for airline ' + i);

      let votes1 = await config.flightSuretyApp.getAirlineVoteCount.call(airline);
      assert.equal(votes1.toNumber(), 0, 'airline ' + i + ' should no vote so far');

      // ACT
      let transaction1 = await config.flightSuretyApp.registerAirline(airline, { from: accounts[1] });

      // ASSERT
      assert.equal(transaction1.logs[0].args.success, true, "airline registration should succeed");

      votes1 = transaction1.logs[0].args.votes;
      assert.equal(votes1.toNumber(), 1, 'airline ' + i + ' should 1 vote');

      result1 = await config.flightSuretyApp.isAirline.call(airline);
      assert.equal(result1, true, "Airline should be registered");

      voted1 = await config.flightSuretyApp.hasAccountVoted.call(airline, accounts[1]);
      assert.equal(voted1, true, 'account 1 should have voted for airline ' + i);
    }

    // ASSERT
    registeredCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(4, registeredCount, 'Total number of airlines registered should be 4');

    let airline5 = accounts[5];

    // ACT
    let transaction2 = await config.flightSuretyApp.registerAirline(airline5, { from: accounts[1] });

    // ASSERT
    assert.equal(transaction2.logs[0].args.success, false, "airline registration should not succeed");

    let votes2 = transaction2.logs[0].args.votes;
    assert.equal(votes2.toNumber(), 1, 'airline 5 should 1 vote');

    let result2 = await config.flightSuretyApp.isAirline.call(airline5);
    assert.equal(result2, false, "airline 5 should not be registered");

    let voted2 = await config.flightSuretyApp.hasAccountVoted.call(airline5, accounts[1]);
    assert.equal(voted2, true, 'account 1 should have voted for airline 5');

    registeredCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(4, registeredCount, 'Total number of airlines registered should still be 4');
  });

  it('4 - (airline) can register an Airline with multipart consensus after 4 airlines already registered', async () => {
    // prerequisite check
    let registeredCountPrevious = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredCountPrevious.toNumber(), 4, 'total number of airlines registered should be 4');

    // fund
    for (let i = 2; i <= 3; i++) {
      await config.flightSuretyApp.sendTransaction({
        value: web3.utils.toWei('10', 'ether'),
        from: accounts[i]
      });
    }

    // ARRANGE
    let airline6 = accounts[6];

    // prerequisite check
    let registered = await config.flightSuretyApp.isAirline.call(airline6);
    assert.equal(registered, false, "airline 6 should not be registered");

    let votes = await config.flightSuretyApp.getAirlineVoteCount.call(airline6);
    assert.equal(votes.toNumber(), 0, 'airline 6 should have 0 vote so far');

    let voted = await config.flightSuretyApp.hasAccountVoted.call(airline6, accounts[2]);
    assert.equal(voted, false, 'account 2 should have not voted for airline 6 yet');

    // let account2 vote for airline 5 by trying to register 
    let transaction = await config.flightSuretyApp.registerAirline(airline6, { from: accounts[2] });

    // ASSERT
    assert.equal(transaction.logs[0].args.success, false, "airline registration should not succeed");

    votes = transaction.logs[0].args.votes;
    assert.equal(votes.toNumber(), 1, 'airline 6 should 1 votes now');

    let result = await config.flightSuretyApp.isAirline.call(airline6);
    assert.equal(result, false, "airline 6 should not be registered because it has got only 1 consensus so far.");

    voted = await config.flightSuretyApp.hasAccountVoted.call(airline6, accounts[2]);
    assert.equal(voted, true, 'account 2 should have voted for airline 6 by now');

    let registeredCountAfter = await config.flightSuretyApp.getRegisteredAirlineCount.call();

    assert.equal(registeredCountPrevious.toNumber(), registeredCountAfter.toNumber(), 'register airline count should stay the same');

    // ACT
    transaction = await config.flightSuretyApp.registerAirline(airline6, { from: accounts[3] });

    // ASSERT
    assert.equal(transaction.logs[0].args.success, true, "airline registration should succeed");

    votes = transaction.logs[0].args.votes;
    assert.equal(votes.toNumber(), 2, 'airline 6 should 2 votes now');

    result = await config.flightSuretyApp.isAirline.call(airline6);
    assert.equal(result, true, "airline 6 should be registered because it has got 3 consensus so far which is more than half of 4 registered airlines.");
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
