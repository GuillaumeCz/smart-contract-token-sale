pragma solidity ^0.4.0;


import "./BlockFoodToken.sol";


contract BlockFoodTokenTestable is BlockFoodToken {
    /*

    Donation definition

    */
    // Amount collected without reward
    uint public donations;

    constructor
    (
    address _target,
    uint _phase1Date,
    uint _phase2Date,
    uint _phase3Date,
    uint _phase4Date,
    uint _endDate,
    uint _phase1Rate,
    uint _phase2Rate,
    uint _phase3Rate,
    uint _phase4Rate,
    uint _minCap,
    uint _maxCap
    ) BlockFoodToken(
    _target,
    _phase1Date,
    _phase2Date,
    _phase3Date,
    _phase4Date,
    _endDate,
    _phase1Rate,
    _phase2Rate,
    _phase3Rate,
    _phase4Rate,
    _minCap,
    _maxCap
    )
    public
    {

    }

    // Event triggered on donation
    event ThankYou(address account, uint256 etherDonated);

    function donate()
    public
    payable
    {
        donations += msg.value;
        emit ThankYou(msg.sender, msg.value);
    }

    function withdrawDonations()
    public
    onlyOwner
    {
        uint amount = donations;
        donations = 0;
        target.transfer(amount);
    }
}
