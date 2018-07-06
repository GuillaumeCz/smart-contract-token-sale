pragma solidity ^0.4.0;

import "./ERC20Token.sol";

contract BlockFoodToken is ERC20Token {

    // Symbol of the token
    string public constant symbol = "BFC";

    // Name of the token
    string public constant name = "BlockFoodToken";

    /*

    Token Sale definition

    */

    // Dates
    uint public phase1Date;

    uint public phase2Date;

    uint public phase3Date;

    uint public phase4Date;

    uint public endDate;

    // Rates
    uint public phase1Rate;

    uint public phase2Rate;

    uint public phase3Rate;

    uint public phase4Rate;

    // Caps
    uint public minCap;

    uint public maxCap;

    // History
    mapping(address => uint256) history;

    // Use to finalize the token sale
    bool public isFinalized = false;

    // Use to cancel the token sale
    bool public isCancelled = false;


    /*

    Events

    */

    // Event triggered on donation exchanged for BlockFoodTokens
    event Donation(address account, uint256 etherDonated, uint256 BlockFoodTokens);

    // Event triggered on refund being executed
    event Refund(address account, uint256 etherRefunded);

    /*

    Modifiers

    */

    // Use to prevent access to a function from anyone except the owner
    modifier onlyOwner () {
        require(msg.sender == owner);
        _;
    }

    // Use to prevent access to a function outside of token sale dates and if maxCap is reached
    modifier onlyActiveDuringTokenSale()
    {
        // time
        require(now >= phase1Date);
        require(now <= endDate);

        // cap
        require(address(this).balance <= maxCap);

        _;
    }

    // Use to prevent access to a function before the endDate
    modifier onlyAfterEndDateOrMaxCapReached()
    {
        require(now >= endDate || address(this).balance >= maxCap);
        _;
    }

    // Use to prevent access to a function if not cancelled
    modifier onlyIfCancelled()
    {
        require(isCancelled);
        _;
    }

    // Use to prevent access to a function before two months after the end
    modifier onlyAfterTwoMonthsAfterTheEnd()
    {
        require(now > (endDate + 60 days));
        _;
    }

    /*

    Constructor

    */

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
    )
    public
    {
        // set owner
        owner = msg.sender;

        // set target
        target = _target;

        // set phase dates
        phase1Date = _phase1Date;
        phase2Date = _phase2Date;
        phase3Date = _phase3Date;
        phase4Date = _phase4Date;
        endDate = _endDate;

        // set rates
        phase1Rate = _phase1Rate;
        phase2Rate = _phase2Rate;
        phase3Rate = _phase3Rate;
        phase4Rate = _phase4Rate;

        // set caps
        minCap = _minCap;
        maxCap = _maxCap;
    }

    /*

    Token sale functions

    */

    // Functions for external users

    function apply()
    public
    payable
    onlyActiveDuringTokenSale
    {
        uint bfc;

        if (now < phase2Date) {
            bfc = msg.value * phase1Rate;
        }
        else if (now < phase3Date) {
            bfc = msg.value * phase2Rate;
        }
        else if (now < phase4Date) {
            bfc = msg.value * phase3Rate;
        }
        else if (now < endDate) {
            bfc = msg.value * phase4Rate;
        }
        else {
            // should not be here given onlyActiveDuringTokenSale modifier
            revert();
        }

        if (bfc > 0) {
            mint(msg.sender, bfc);
            history[msg.sender] += msg.value;
            emit Donation(msg.sender, msg.value, bfc);
        }
    }

    function historyOf(address addr) constant public returns (uint256) {
        return history[addr];
    }

    function refund()
    public
    onlyIfCancelled
    {
        uint amountToRefund = history[msg.sender];
        if (amountToRefund > 0) {
            history[msg.sender] = 0;
            msg.sender.transfer(amountToRefund);
            emit Refund(msg.sender, amountToRefund);
        }
    }

    // Functions for owner

    function finalize()
    public
    onlyOwner
    onlyAfterEndDateOrMaxCapReached
    {
        if (!isFinalized) {
            isFinalized = true;

            if (address(this).balance < minCap) {
                isCancelled = true;
            }
            else {
                uint bfcForTarget = (uint)((_totalSupply * 10) / 7) - _totalSupply;
                mint(target, bfcForTarget);
                target.transfer(address(this).balance);
            }
        }
        else {
            revert();
        }
    }

    // safety function in case something goes wrong, funds are available two months after the end
    function withdraw()
    public
    onlyOwner
    onlyAfterTwoMonthsAfterTheEnd
    {
        target.transfer(address(this).balance);
    }

    // Private functions

    // mint is only called from buy() and finalize()
    function mint(address addr, uint bfcToCreate) private {
        balances[addr] += bfcToCreate;
        _totalSupply += bfcToCreate;
    }
}
