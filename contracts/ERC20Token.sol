pragma solidity ^0.4.0;


// from https://theethereum.wiki/w/index.php/ERC20_Token_Standard
contract ERC20Interface {
    // Get the total token supply
    function totalSupply() constant public returns (uint256);

    // Get the account balance of another account with address _owner
    function balanceOf(address _owner) constant public returns (uint256 balance);

    // Send _value amount of tokens to address _to
    function transfer(address _to, uint256 _value) public returns (bool success);

    // Send _value amount of tokens from address _from to address _to
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success);


    // Allow _spender to withdraw from your account, multiple times, up to the _value amount.
    // If this function is called again it overwrites the current allowance with _value.
    // this function is required for some DEX functionality
    function approve(address _spender, uint256 _value) public returns (bool success);

    // Returns the amount which _spender is still allowed to withdraw from _owner
    function allowance(address _owner, address _spender) constant public returns (uint256 remaining);

    // Triggered when tokens are transferred.
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    // Triggered whenever approve(address _spender, uint256 _value) is called.
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}


contract ERC20Token is ERC20Interface {
    /*

    Token definition

    */

    // Owner of the contract
    address public owner;

    // Target for the token sale
    address public target;

    // Balances for each account
    mapping (address => uint256) balances;

    // Owner of account approves the transfer of an amount to another account
    mapping (address => mapping (address => uint256)) allowed;

    // Symbol of the token
    string public constant symbol = "ERC20";

    // Name of the token
    string public constant name = "ERC20 Token";

    // Decimal quantity
    uint8 public constant decimals = 18;

    // Initial supply
    uint256 _totalSupply = 0;

    /*

    ERC20Token functions
    from https://theethereum.wiki/w/index.php/ERC20_Token_Standard

    */

    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    function balanceOf(address addr) constant public returns (uint256 balance)
    {
        return balances[addr];
    }

    function totalSupply() constant public returns (uint256)
    {
        return _totalSupply;
    }

    function transfer(address _to, uint256 _amount)
    public
    returns (bool success)
    {
        if (balances[msg.sender] >= _amount
        && _amount > 0
        && balances[_to] + _amount > balances[_to]
        ) {
            balances[msg.sender] -= _amount;
            balances[_to] += _amount;
            emit Transfer(msg.sender, _to, _amount);
            return true;
        }
        else {
            return false;
        }
    }

    function transferFrom(
    address _from,
    address _to,
    uint256 _amount
    )
    public
    returns (bool success)
    {
        if (balances[_from] >= _amount
        && allowed[_from][msg.sender] >= _amount
        && _amount > 0
        && balances[_to] + _amount > balances[_to]
        ) {
            balances[_from] -= _amount;
            allowed[_from][msg.sender] -= _amount;
            balances[_to] += _amount;
            emit Transfer(_from, _to, _amount);
            return true;
        }
        else {
            return false;
        }
    }

    // Allow _spender to withdraw from your account, multiple times, up to the _value amount.
    // If this function is called again it overwrites the current allowance with _value.
    function approve(address _spender, uint256 _amount) public returns (bool success) {
        allowed[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    function allowance(address _owner, address _spender) constant public returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }
}
