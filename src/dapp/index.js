
import DOM from './dom';
import Contract from './contract';

(async () => {

  let result = null;

  let contract = new Contract('localhost', () => {

    // Read transaction
    contract.isOperational((err, res) => {
      console.log(err, res);
      display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: err, value: res }]);
    });

    let airlineNames = ['Air Kitty', 'Air Rabbit', 'Air Puppy', 'Air Mice', 'Air Panda'];

    for (let i = 1; i < contract.airlines.length; i++) {
      let airline = contract.getAirline(i);
      let option = DOM.option();
      option.value = airline;
      option.innerText = airlineNames[i - 1] + ' (' + airline.substring(0, 6) + '..)';
      DOM.elid('airline-account').appendChild(option);
    }

    // User-submitted transaction
    DOM.elid('submit-oracle').addEventListener('click', () => {
      let airline = DOM.elid('airline-account').value;
      let flight = DOM.elid('flight-number').value;
      // Write transaction
      contract.fetchFlightStatus(airline, flight, (err, res) => {
        display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: err, value: res.flight + ' ' + res.timestamp }]);
      });
    })

  });


})();


function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: 'row' }));
    row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
    row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
    section.appendChild(row);
  })
  displayDiv.append(section);

}







