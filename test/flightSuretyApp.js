
var Test = require('../config/testConfig.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
  });

  /****************************************************************************************/
  /* Airline registration                                                                 */
  /****************************************************************************************/

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();

    assert(registeredAirlineCount < 4, 'Too many airlines registered');

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
    }
    catch (e) {

    }
    let result = await config.flightSuretyApp.isAirline.call(newAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();

    assert(registeredAirlineCount < 4, 'Too many airlines registered');

    // fund
    await config.flightSuretyApp.sendTransaction({
      value: web3.utils.toWei('10', 'ether'),
      from: config.firstAirline
    });

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
    }
    catch (e) {

    }
    let result = await config.flightSuretyApp.isAirline.call(newAirline);

    // ASSERT
    assert.equal(result, true, "Airline should be registered");
  });

  it('(airline) cannot register an Airline without multipart consensus after 4 airlines already registered', async () => {
    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();

    assert(registeredAirlineCount < 4, 'Too many airlines registered');

    // fund
    await config.flightSuretyApp.sendTransaction({
      value: web3.utils.toWei('10', 'ether'),
      from: config.firstAirline
    });

    // ARRANGE
    [3, 4].forEach(async (i) => {
      let newAirline = accounts[i];

      // ACT
      try {
        await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
      }
      catch (e) {

      }
      let result1 = await config.flightSuretyApp.isAirline.call(newAirline);

      // ASSERT
      assert.equal(result1, true, "Airline should be registered");
    });

    let additionalAirline = accounts[5];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(additionalAirline, { from: config.firstAirline });
    }
    catch (e) {

    }
    let result2 = await config.flightSuretyApp.isAirline.call(additionalAirline);

    // ASSERT
    assert.equal(result2, false, "Airline should be registered");
  });


  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

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

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

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
