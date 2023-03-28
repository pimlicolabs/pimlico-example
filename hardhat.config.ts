import { HardhatUserConfig } from "hardhat/config";
import fs from 'fs'
import { task } from "hardhat/config";
import { runOp1, callData, fillUserOp, getInitCode, getSender, signUserOp, signUserOpWithPaymaster } from "./scripts/runOp";
import "@nomiclabs/hardhat-ethers";
import { hexlify } from "ethers/lib/utils";
import { Signer, Wallet } from "ethers";
require('dotenv').config();

const infuraKey = process.env.INFURA_KEY;
const mnemonicFileName = process.env.MNEMONIC_FILE
let mnemonic = 'test '.repeat(11) + 'junk'
if (mnemonicFileName != null && fs.existsSync(mnemonicFileName)) {
  mnemonic = fs.readFileSync(mnemonicFileName, 'ascii').trim()
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
  solidity: "0.8.18",
  networks: {
    goerli: getNetwork('goerli'),
    arbitrum: getNetwork('arbitrum-mainnet'),
  }
};

task('get-sender', 'Get sender address')
  .addParam('owner', 'Owner address')
  .addParam('nonce', 'Nonce')
  .setAction(async (taskArgs, hre) => {
    const sender = await getSender(hre,taskArgs.owner, taskArgs.nonce);
    console.log("sender addr : " + sender.address);
  });

task("test-paymaster", "Test paymaster")
  .addParam('owner', 'Owner address')
  .addParam('nonce', 'Nonce')
  .setAction(async (taskArgs, hre) => {
    const sender = await getSender(hre,taskArgs.owner, taskArgs.nonce);
    let initCode = "0x";
    if(await hre.ethers.provider.getCode(sender.address) == '0x') {
      console.log("Sender is not deployed");
      initCode = getInitCode(hre, taskArgs.owner, taskArgs.nonce);
    }
    const userOp = await fillUserOp(hre, {
      sender: sender.address,
      initCode: initCode,
      callData: await callData(hre, sender.address, 0, "0x"),
    });
    let signer : Signer;
    if(taskArgs.owner.toLowerCase() == "0xae72a48c1a36bd18af168541c53037965d26e4a8") {
      // test account
      signer = new Wallet('0x'.padEnd(66, '7'));
    } else {
      signer = hre.ethers.provider.getSigner(taskArgs.owner);
    }
    userOp.paymasterAndData = hexlify(await signUserOpWithPaymaster(hre, userOp));
    userOp.signature = hexlify(await signUserOp(hre, userOp, signer));
    await runOp1(hre, userOp);
  });

task("test-bundler", "Test paymaster")
  .addParam('owner', 'Owner address')
  .addParam('nonce', 'Nonce')
  .setAction(async (taskArgs, hre) => {
    const sender = await getSender(hre,taskArgs.owner, taskArgs.nonce);
    console.log("sender addr : " + sender.address);
    let initCode = "0x";
    if(await hre.ethers.provider.getCode(sender.address) == '0x') {
      console.log("Sender is not deployed");
      initCode = getInitCode(hre, taskArgs.owner, taskArgs.nonce);
    }
    const userOp = await fillUserOp(hre, {
      sender: sender.address,
      initCode: initCode,
      callData: await callData(hre, sender.address, 0, "0x"),
    });
    let signer : Signer;
    if(taskArgs.owner.toLowerCase() == "0xae72a48c1a36bd18af168541c53037965d26e4a8") {
      // test account
      signer = new Wallet('0x'.padEnd(66, '7'));
    } else {
      signer = hre.ethers.provider.getSigner(taskArgs.owner);
    }
    userOp.signature = hexlify(await signUserOp(hre, userOp, signer));
    userOp.paymasterAndData = hexlify("0x");
    await runOp1(hre, userOp);
  });

export default config;
