# Pimlico Endpoint Demo

## Configuring Environment Variables

First, make a copy of the example environment file:

`cp .env.example .env`

Then echo your mnemonic into a file:

`echo <YOUR_MNEMONIC_HERE> >> mnemonic.txt`

Finally, update the .env file with your Pimlico API key, Infura API key (not the whole URL).

## Running Tests

For demonstration purposes, use the address 0xae72a48c1a36bd18af168541c53037965d26e4a8 as the owner. This address corresponds to the private key 0x7777....7777.

### Test Bundler

Execute the following command to send a blank transaction to itself through the Pimlico RPC endpoint:

`npx hardhat test-bundler --owner <OWNER ADDRESS> --network <NETWORK NAME>`

For example: `npx hardhat test-bundler --owner 0x0284EaFa1f47dff44112BDFeBB736B9e85B416c9 --network goerli`

This command will create a sender if necessary.

### Test Bundler with Pimlico Paymaster

To send a blank transaction to itself through the Pimlico RPC endpoint, sponsored by a paymaster, use the following command:

`npx hardhat test-paymaster --owner <OWNER ADDRESS> --network <NETWORK NAME>`

For example: `npx hardhat test-paymaster --owner 0x0284EaFa1f47dff44112BDFeBB736B9e85B416c9 --network goerli`

Similar to the previous test, this command will create a sender if needed.

### Test factory access storage with minimum stake amount

To test the factory access storage with a minimum stake amount, use the following command:

`npx hardhat test-factory-access-storage --network <NETWORK NAME>`

this command will

1. create factory that access storage while deploying

2. stake 1 wei to the entrypoint on behalf of the factory

3. send 0.1 ether to sender address(for gas fee)

4. create sender with bundler
