const FlightSuretyApp = require('../../build/contracts/FlightSuretyApp.json');
const Config = require('./config.json');
const Web3 = require('web3');
const express = require('express');

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const STATUS_CODES = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER
];

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

let accounts = null;
web3.eth.getAccounts().then(res => {
  accounts = res;
  web3.eth.defaultAccount = accounts[0];

  let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
  flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event);

    let status = Math.random() > 0.5 ?
      STATUS_CODE_ON_TIME : STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];

    flightSuretyApp.methods.submitOracleResponse(
      event.returnValues.index,
      event.returnValues.airline,
      event.returnValues.flight,
      event.returnValues.timestamp,
      status
    ).send({ from: web3.eth.defaultAccount })
  });
});

const app = express();
app.get('/api', (req, res) => {
  console.log(req);
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

module.exports = { app };
