// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "./FlightSuretyData.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private _contractOwner; // Account used to deploy contract
    FlightSuretyData private _data; // FlightSuretyData contract instance

    mapping(address => uint256) private _registeredAirlineBalanceMap;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }
    mapping(bytes32 => Flight) private _flights;

    struct Insurance {
        address passenger;
        bytes32 flightKey;
        uint256 amount;
    }

    mapping(bytes32 => Insurance[]) private _flightKeyToInsurance;
    mapping(address => uint256) _passengerToBalance;

    event Log(bool success, uint8 votes);

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(true, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == _contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires a registered airline account to be the function caller
     */
    modifier requireRegisteredAirline() {
        require(
            _data.isAirline(msg.sender),
            "Caller is not a registered airline"
        );
        _;
    }

    modifier requireEnoughFunding() {
        require(
            _registeredAirlineBalanceMap[msg.sender] >= 1000000000000000000 // unit: wei
        );
        _;
    }

    modifier requireRegisteredFlight(
        address airline,
        string memory flight,
        uint256 timestamp
    ) {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        require(_flights[flightKey].isRegistered, "Flight is not registered");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address firstAirline) {
        _contractOwner = msg.sender;

        // Initialize FlightSuretyData contract
        _data = new FlightSuretyData();

        _data.registerAirline(firstAirline, _contractOwner);
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {
        require(false, "DEBUG: fallback() is called");
    }

    receive() external payable requireIsOperational requireRegisteredAirline {
        _registeredAirlineBalanceMap[msg.sender] += msg.value;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns (bool) {
        return _data.isOperational();
    }

    function setOperatingStatus(bool mode) public requireContractOwner {
        _data.setOperatingStatus(mode);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address airline)
        public
        requireIsOperational
        requireRegisteredAirline
        requireEnoughFunding
    {
        (bool success, uint8 votes) = _data.registerAirline(
            airline,
            msg.sender
        );
        emit Log(success, votes);
    }

    function isAirline(address airline)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return _data.isAirline(airline);
    }

    function getRegisteredAirlineCount()
        public
        view
        requireIsOperational
        returns (uint8)
    {
        return _data.getRegisteredAirlineCount();
    }

    function getAirlineVoteCount(address airline)
        public
        view
        requireIsOperational
        returns (uint8)
    {
        return _data.getAirlineVoteCount(airline);
    }

    function hasAccountVoted(address airline, address account)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return _data.hasAccountVoted(airline, account);
    }

    /**
     * @dev Buy insurance for a flight
     */
    function buy(
        address airline,
        string memory flight,
        uint256 timestamp
    )
        public
        payable
        requireIsOperational
        requireRegisteredFlight(airline, flight, timestamp)
    {
        require(
            msg.value <= 1000000000000000000,
            "flight insurance must be no more than 1 ether"
        );

        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        Insurance memory insurance = Insurance(
            msg.sender,
            flightKey,
            msg.value
        );

        _flightKeyToInsurance[flightKey].push(insurance);
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(bytes32 flightKey) internal requireIsOperational {
        Insurance[] memory insuranceArray = _flightKeyToInsurance[flightKey];
        for (uint256 i = 0; i < insuranceArray.length; i++) {
            Insurance memory insurance = insuranceArray[i];
            // passenger receives credit of 1.5X the amount they paid
            _passengerToBalance[insurance.passenger] += SafeMath.add(
                insurance.amount,
                SafeMath.div(insurance.amount, 2)
            );
        }
    }

    function getCreditBalance()
        public
        view
        requireIsOperational
        returns (uint256)
    {
        return _passengerToBalance[msg.sender];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     */
    function withdraw() public requireIsOperational returns (bool) {
        uint256 repayment = _passengerToBalance[msg.sender];

        if (repayment > 0) {
            _passengerToBalance[msg.sender] = 0;

            (bool sent, ) = msg.sender.call{value: repayment}("");

            if (sent) {
                return true;
            }

            // If the call fails, refund the money
            _passengerToBalance[msg.sender] = repayment;
            return false;
        }

        return false;
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(string memory flight, uint256 timestamp)
        public
        requireIsOperational
        requireRegisteredAirline
    {
        bytes32 flightKey = getFlightKey(msg.sender, flight, timestamp);

        Flight memory newFlight = Flight(
            true,
            STATUS_CODE_UNKNOWN,
            timestamp,
            msg.sender
        );

        _flights[flightKey] = newFlight;
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) public requireIsOperational requireContractOwner {
        // calculate insurance for each passenger
        if (statusCode != STATUS_CODE_LATE_AIRLINE) {
            return;
        }

        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        _flights[flightKey].statusCode = statusCode;

        creditInsurees(flightKey);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );

        oracleRequests[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleRequests;
    mapping(bytes32 => mapping(uint8 => address[])) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleRequests[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key][statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key][statusCode].length >= MIN_RESPONSES) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        internal
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
