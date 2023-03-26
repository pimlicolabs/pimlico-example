# Example script for running pimlico endpoint

## Setting up environment variable

`cp .env.example .env`

set your pimlico api key, infura api key, mnemonic file

for simple usage, store your privateKey to mnemonic.txt and use that as mnemonic file path


## running tests

for sample usage, i recommend you to use address `0xae72a48c1a36bd18af168541c53037965d26e4a8` as owner, this address is owned by privateKey `0x7777....7777`

### send userOp to bundler

`npx hardhat test-bundler --owner <OWNER ADDRESS> --nonce <ACCOUNT INDEX> --network <NETWORK NAME>`

this will send blank transaction to itself through pimlico rpc endpoint.

it will create sender if needed

### send userOp sponsored by paymaster

`npx hardhat test-paymaster --owner <OWNER ADDRESS> --nonce <ACCOUNT INDEX> --network <NETWORK NAME>`

this will send blank transaction to itself through pimlico rpc endpoint and sponsored by paymaster

it will create sender if needed
