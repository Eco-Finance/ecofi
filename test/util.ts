import { ethers } from "hardhat";

const SECONDS_IN_A_DAY = 24 * 60 * 60;

export async function currentBlockTimestamp(): Promise<number> {
  const number = ethers.provider.getBlockNumber();
  const block = ethers.provider.getBlock(number);
  return (await block).timestamp;
}

export async function fastForwardDays(days: number) {
  const seconds = days * SECONDS_IN_A_DAY;
  const nextBlockTimestamp = await currentBlockTimestamp() + seconds;
  await ethers.provider.send("evm_setNextBlockTimestamp", [nextBlockTimestamp])
  await ethers.provider.send("evm_mine", []);
}
