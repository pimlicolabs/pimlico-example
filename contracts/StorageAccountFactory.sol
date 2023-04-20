// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";


// THIS IS NOT SAFE FOR PRODUCTION USE
contract SampleAccount is IAccount {
    address public owner;
    uint256 public value;

    constructor(address _owner) {
        owner = _owner;
    }

    function validateUserOp(UserOperation calldata _op, bytes32 _opHash, uint256 _missingFunds) external override returns (uint256){
        msg.sender.call{value:_missingFunds}("");
        return 0;
    }

    function doNothing() external{
        value++;
    }
}

contract StorageAccountFactory {
    mapping(address => address[]) public accounts;

    IEntryPoint immutable public entryPoint;

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;    
    }

    function createAccount(address _owner, uint256 salt) public returns(address) {
        address account = address(new SampleAccount{salt: bytes32(salt)}(_owner));
        accounts[_owner].push(account);
        return account;
    }

    function getAddress(address _owner, uint256 salt) public view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(abi.encodePacked(type(SampleAccount).creationCode, abi.encode(_owner))))
        );
        // NOTE: cast last 20 bytes of hash to address
        return address(uint160(uint(hash)));
    }

    function stake() public payable {
        IStakeManager(address(entryPoint)).addStake{value:msg.value}(1);
    }
}