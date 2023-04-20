import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumberish, Signer } from "ethers";
import { SimpleAccountFactory__factory, SimpleAccountFactory, EntryPoint__factory, SimpleAccount, SimpleAccount__factory } from "@account-abstraction/contracts";
import { arrayify, hexConcat, hexlify } from "ethers/lib/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";

require('dotenv').config();

const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const config = require('../configs/config.json');

function getBundlerUrl(network : string) : string {
  return `https://api.pimlico.io/v1/${network}/rpc?apikey=${PIMLICO_API_KEY}`
}

interface UserOpStruct {
  sender: string,
  nonce: BigNumberish,
  initCode : string,
  callData : string,
  callGasLimit : BigNumberish,
  verificationGasLimit : BigNumberish,
  preVerificationGas : BigNumberish,
  maxFeePerGas : BigNumberish,
  maxPriorityFeePerGas : BigNumberish,
  paymasterAndData : string,
  signature : string
}

export async function sendUserOperation(hre : HardhatRuntimeEnvironment, userOp : UserOpStruct): Promise<string> {
  const bundlerProvider = new JsonRpcProvider(getBundlerUrl(hre.network.name));
  const receipt = await bundlerProvider.send("eth_sendUserOperation", [
    userOp,
    config[hre.network.name].entrypoint,
  ]);
  return receipt
}

export async function estimateUserOperationGas(hre : HardhatRuntimeEnvironment, userOp : UserOpStruct) {
  const bundlerProvider = new JsonRpcProvider(getBundlerUrl(hre.network.name));
  const {preVerificationGas, verificationGas, callGasLimit} = await bundlerProvider.send("eth_estimateUserOperationGas", [
    userOp,
    config[hre.network.name].entrypoint,
  ]);

  return {preVerificationGas, verificationGas, callGasLimit};
}

export async function getUserOperationReceipt(hre : HardhatRuntimeEnvironment, userOpHash : string): Promise<any> {
  const bundlerProvider = new JsonRpcProvider(getBundlerUrl(hre.network.name));
  const receipt = await bundlerProvider.send("eth_getUserOperationReceipt", [
    userOpHash,
  ]);
  return receipt;
}

export async function signUserOp(hre: HardhatRuntimeEnvironment, userOp : UserOpStruct, signer : Signer) : Promise<string> {
  const entryPoint = EntryPoint__factory.connect(config[hre.network.name].entrypoint, hre.ethers.provider);
  const signature = await signer.signMessage(arrayify(await entryPoint.getUserOpHash(userOp)));
  return signature;
}

export async function testCreateAccount(hre: HardhatRuntimeEnvironment, signer : Signer) : Promise<string> {
  const bundlerProvider = new JsonRpcProvider(getBundlerUrl(hre.network.name));

  const factory = await hre.ethers.getContractFactory("StorageAccountFactory")
  const contract =  await factory.connect(signer).deploy("0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789");
  console.log("Factory address: ", contract.address);
  const sender = await contract.getAddress(await signer.getAddress(), 0);
  console.log("Sender Address: ", sender)

  const sampleAccount = await hre.ethers.getContractFactory("SampleAccount")
  const stakingTx = await contract.stake({value: 1})
  console.log("waiting for staking tx to be confirmed...")
  await stakingTx.wait(3)

  const fundingTx = await signer.sendTransaction({
    to:sender,
    value: hre.ethers.utils.parseEther("0.1")
  })

  await fundingTx.wait(3)
  console.log("waiting for funding tx to be confirmed...")
  const userOp = await fillUserOp(hre, {
    sender: sender,
    initCode: hexConcat([contract.address, factory.interface.encodeFunctionData('createAccount', [await signer.getAddress(), 0])]),
    callData: sampleAccount.interface.encodeFunctionData("doNothing",[]),
  });

  await bundlerProvider.send("eth_sendUserOperation", [
    userOp,
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  ]);
  return sender;
}

export async function callData(hre: HardhatRuntimeEnvironment, to : string, value: BigNumberish, data: string) : Promise<string> {
  const account = SimpleAccount__factory.connect(config[hre.network.name].factory, hre.ethers.provider);
  return account.interface.encodeFunctionData('execute', [to, value, data]);
}

export async function fillUserOp(hre: HardhatRuntimeEnvironment, userOp:Partial<UserOpStruct>) : Promise<UserOpStruct> {
  const signer = hre.ethers.provider.getSigner();
  const sender = SimpleAccount__factory.connect(userOp.sender!, signer);
  if(await hre.ethers.provider.getCode(userOp.sender!) == '0x') {
    userOp.nonce = hexlify(0);
  } else {
    userOp.nonce = hexlify((await sender.getNonce()).toNumber());
  }
  userOp.callGasLimit = hexlify(100000);
  userOp.verificationGasLimit = hexlify(1000000);
  userOp.preVerificationGas = hexlify(100000);

  const gasPrice = (await hre.ethers.provider.getGasPrice()).mul(2)

  userOp.maxFeePerGas = hexlify(gasPrice);
  userOp.maxPriorityFeePerGas = hexlify(gasPrice);
  userOp.paymasterAndData = hexlify('0x');
  userOp.signature = hexlify('0x');
  return userOp as UserOpStruct;
}

export async function signUserOpWithPaymaster(hre: HardhatRuntimeEnvironment, userOp : UserOpStruct) : Promise<string> {
  const bundlerProvider = new JsonRpcProvider(getBundlerUrl(hre.network.name));
  const signature = await bundlerProvider.send("pm_sponsorUserOperation", [
    userOp,
    {
      entryPoint : config[hre.network.name].entrypoint,
    }
  ]);
  return signature.paymasterAndData;
}

export function getInitCode(hre: HardhatRuntimeEnvironment, owner : string) : string {
  const factory = SimpleAccountFactory__factory.connect(config[hre.network.name].factory, hre.ethers.provider);
  const data = hexConcat([factory.address, factory.interface.encodeFunctionData('createAccount', [owner, 0])]);
  return data;
}

export async function getSender(hre : HardhatRuntimeEnvironment, owner : string) : Promise<SimpleAccount> {
  const signer = hre.ethers.provider.getSigner();
  const entryPoint = EntryPoint__factory.connect(config[hre.network.name].entrypoint, signer);
  const initCode = getInitCode(hre, owner);
  const sender : string = await entryPoint.getSenderAddress(initCode).then(x => {
    throw new Error("should be reverted");
  }).catch((e) => {
    const data = e.message.split('0x6ca7b806')[1].split("\"")[0];
    const addr = hre.ethers.utils.getAddress('0x' + data.slice(24, 64));
    return addr;
  });
  return SimpleAccount__factory.connect(sender, hre.ethers.provider);
}
