// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private _contractOwner; // Account used to deploy contract
    bool private _operational = true; // Blocks all state changes throughout the contract if false

    uint8 private _registeredAirlineCount;
    mapping(address => mapping(address => bool))
        private _registeredAirlineVoterMap;
    mapping(address => uint8) private _registeredAirlineVoteCountMap;
    mapping(address => bool) private _registeredAirlineMap;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes _contractOwner
     */
    constructor() {
        _contractOwner = msg.sender;
    }

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
        require(_operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "_ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == _contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return _operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        _operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address airline)
        public
        requireIsOperational
        requireContractOwner
    {
        // check if airline is already registered
        if (_registeredAirlineMap[airline]) {
            return;
        }

        // check if caller has already voted for this airline
        if (_registeredAirlineVoterMap[airline][msg.sender]) {
            return;
        }

        // increment vote count for airline to be registered
        _registeredAirlineVoteCountMap[airline] += 1;
        _registeredAirlineVoterMap[airline][msg.sender] = true;

        // if already 4 or more registerd airlines,
        if (_registeredAirlineCount >= 4) {
            // and airline vote count is less than half # of registred airlines,
            if (
                _registeredAirlineVoteCountMap[airline] * 2 <
                _registeredAirlineCount
            ) {
                // then do nothing
                return;
            }
        }

        // register the airline
        _registeredAirlineMap[airline] = true;

        // increment number of registered airlines
        _registeredAirlineCount += 1;
    }

    function isAirline(address airline) public view returns (bool) {
        return _registeredAirlineMap[airline];
    }

    function getRegisteredAirlineCount() public view returns (uint8) {
        return _registeredAirlineCount;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {
        require(false, "DEBUG: fallback() is called");
        fund();
    }

    receive() external payable {
        require(false, "DEBUG: receive() is called");
        fund();
    }
}
