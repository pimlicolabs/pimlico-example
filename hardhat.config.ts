import { HardhatUserConfig } from "hardhat/config";
import fs from 'fs'
import { task } from "hardhat/config";
import { sendUserOperation, callData, fillUserOp, getInitCode, getSender, signUserOp, signUserOpWithPaymaster, estimateUserOperationGas, getUserOperationReceipt, deployFactory } from "./scripts/runOp";
import "@nomiclabs/hardhat-ethers";
import { hexlify } from "ethers/lib/utils";
import { Signer, Wallet, ethers } from "ethers";
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import { Delegatable4337AccountFactory } from "./typechain-types";
require('dotenv').config();

const infuraKey = process.env.INFURA_KEY;
const mnemonicFileName = process.env.MNEMONIC_FILE
if (infuraKey == null) {
  throw new Error("Please set your INFURA_KEY in a .env file");
}

if (mnemonicFileName == null) {
  throw new Error("Please set your MNEMONIC_FILE in a .env file");
}
let mnemonic: string
if (fs.existsSync(mnemonicFileName)) {
  mnemonic = fs.readFileSync(mnemonicFileName, 'ascii').trim()
} else {
  throw new Error(`Mnemonic file ${mnemonicFileName} not found`)
}

function getNetwork(network : string) {
  console.log(`Using ${network} network`)
  const config = {
    url: `https://${network}.infura.io/v3/${infuraKey}`,
    accounts: mnemonic.startsWith('0x') ? [mnemonic] : {
      mnemonic: mnemonic,
    },
  };
  return config;
}

const config: HardhatUserConfig = {
  typechain: {
    target: "ethers-v5",
  },
  solidity: "0.8.18",
  networks: {
    goerli: getNetwork('goerli'),
    arbitrum: getNetwork('arbitrum-mainnet'),
    "linea-testnet": {
      url: `https://rpc.goerli.linea.build/`,
      accounts: mnemonic.startsWith('0x') ? [mnemonic] : {
        mnemonic: mnemonic,
      },
    },
  }
};

const paymasterFlow = async (hre: any, owner: string, usePaymaster = true) => {
  console.log("Getting sender...")
    const sender = await getSender(hre, owner);
    console.log("Got sender:", sender.address)
    let initCode = "0x";
    if(await hre.ethers.provider.getCode(sender.address) == '0x') {
      console.log("Sender is not deployed, generating initCode...");
      initCode = getInitCode(hre, owner);
    }
    const userOp = await fillUserOp(hre, {
      sender: sender.address,
      initCode: initCode,
      callData: await callData(hre, sender.address, 0, "0x"),
    });
    console.log("---------------------------------------------")
    console.log("User Operation created:")
    console.log(userOp)
    let signer : Signer;
    if(owner.toLowerCase() == "0xae72a48c1a36bd18af168541c53037965d26e4a8") {
      // test account
      signer = new Wallet('0x'.padEnd(66, '7'));
    } else {
      signer = hre.ethers.provider.getSigner(owner);
    }
    console.log("---------------------------------------------")
    if (usePaymaster) {
      console.log("Requesting Pimlico paymaster sponsorship (pm_sponsorUserOperation)...")
      userOp.paymasterAndData = hexlify(await signUserOpWithPaymaster(hre, userOp));
      console.log("Pimlico paymasterAndData received:", userOp.paymasterAndData)
      console.log("---------------------------------------------")
    }
    console.log("Signing user operation with owner...")
    userOp.signature = hexlify(await signUserOp(hre, userOp, signer));
    console.log("User operation signature generated:", userOp.signature)
    console.log("---------------------------------------------")
    console.log("Sending user operation to Pimlico bundler (eth_sendUserOperation)...")
    const userOpHash = await sendUserOperation(hre, userOp);
    console.log("User operation hash received: ", userOpHash);
    console.log("---------------------------------------------")
    console.log("Waiting for user operation receipt (eth_getUserOperationReceipt)...")
    let receipt = await getUserOperationReceipt(hre, userOpHash)
    while (receipt == null) {
      await new Promise(r => setTimeout(r, 1000));
      console.log("Waiting for user operation receipt (eth_getUserOperationReceipt)...")
      receipt = await getUserOperationReceipt(hre, userOpHash)
    }
    console.log("User operation receipt received:", receipt);
    console.log("Pimlico example flow complete!")
}


// combines the two flows - deploy factory and test-paymaster
task('test-4337-delegatable-flow', 'Test 4337 delegatable flow')
  .addParam('owner', 'Owner address')
  .setAction(async (taskArgs, hre) => {
        await paymasterFlow(hre, taskArgs.owner)
  })

task('get-sender', 'Get sender address')
  .addParam('owner', 'Owner address')
  .setAction(async (taskArgs, hre) => {
    const sender = await getSender(hre,taskArgs.owner);
    console.log("Sender address:" + sender.address);
  });

// test with paymaster flow and bundler flow - api key should be loaded up with balance for this to work
task("test-paymaster", "Test paymaster")
  .addParam('owner', 'Owner address')
  .setAction(async (taskArgs, hre) => {
    paymasterFlow(hre, taskArgs.owner)
  });

// test with bundler flow only
task("test-bundler", "Test bundler")
  .addParam('owner', 'Owner address')
  .addParam('nonce', 'Nonce')
  .setAction(async (taskArgs, hre) => {
    paymasterFlow(hre, taskArgs.owner, false)
  });

export default config;
