# Pimlico Endpoint Demo

## Configuring Environment Variables

First, make a copy of the example environment file:

`cp .env.example .env`

Then echo your mnemonic into a file:

`echo <YOUR_MNEMONIC_HERE> >> mnemonic.txt`

Finally, update the .env file with your Pimlico API key, Infura API key (not the whole URL).

You might get an error at first from a lack of the typechain file existence. To fix this problem, first comment-out the typechain import line, run `npx hardhat compile`, (which will generate the types), and then you can restore that import line.

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
