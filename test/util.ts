import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export namespace Amounts {
  export const _0 = BigNumber.from("0");
  export const _10_E18 = BigNumber.from("10").pow(18);
  export const _100_E18 = BigNumber.from("10").pow(19);
  export const _1000_E18 = BigNumber.from("10").pow(20);
  export const _900_E18 = _1000_E18.sub(_100_E18);
}

const SECONDS_IN_A_DAY = 24 * 60 * 60;

export async function currentBlockTimestamp(): Promise<number> {
  const number = ethers.provider.getBlockNumber();
  const block = ethers.provider.getBlock(number);
  return (await block).timestamp;
}

export async function fastForwardTo(nextBlockTimestamp: number) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [nextBlockTimestamp])
  await ethers.provider.send("evm_mine", []);
}
