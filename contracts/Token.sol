// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    address public owner;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initial_supply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initial_supply);
        owner = msg.sender;
    }

    function mint(address to, uint256 amount) public {
        require(owner == msg.sender, "Only owner");
        _mint(to, amount);
    }

    function burn(address to, uint256 amount) public {
        require(owner == msg.sender, "Only owner");
        _burn(to, amount);
    }
}
