import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export namespace Amounts {
  export const _0 = BigNumber.from("0");
  export const _10_E18 = BigNumber.from("10").pow(18);
  export const _100_E18 = BigNumber.from("10").pow(19);
  export const _1000_E18 = BigNumber.from("10").pow(20);
  export const _900_E18 = _1000_E18.sub(_100_E18);
}

export const SECONDS_IN_A_DAY = 24 * 60 * 60;

export async function currentBlockTimestamp(): Promise<number> {
  const number = await ethers.provider.send("eth_blockNumber", []);
  const block = ethers.provider.getBlock(number);
  return (await block).timestamp;
}

export async function fastForwardTo(nextBlockTimestamp: number) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [nextBlockTimestamp])
  await ethers.provider.send("evm_mine", []);
}

export function closeTo(a: BigNumber, b:BigNumber, delta: number): boolean {
  return a.sub(b).abs().lte(delta);
}

const WAD_RAY_RATIO = BigNumber.from(1e9);
export const RAY = BigNumber.from(10).pow(27);

function rayDiv(a: BigNumber, b: BigNumber) {
  return b.div(2).add(a.mul(RAY)).div(b)
}

function rayMul(a: BigNumber, b: BigNumber) {
  return RAY.div(2).add(a.mul(b)).div(RAY);
}

/**
 * Calculate interest on user staked tokens for a specific timestamp.
 * @param stakeBalance      Current staked amount
 * @param lastDeposit       Last time user staked tokens
 * @param lastMint          Last time user minted tokens
 * @param targetTimestamp   Target timestamp at which interest will be calculated
 */
export function calculateTokenGeneration(
  stakeBalance: BigNumber,
  lastDeposit: number,
  lastMint: number,
  targetTimestamp: number,
): BigNumber {
  const USER_SHARE = 90;

  const generationAmount = rayMul(
    stakeBalance.mul(WAD_RAY_RATIO),
    calculateGenerationRate(lastDeposit, lastMint, targetTimestamp),
  ).div(WAD_RAY_RATIO);
  return generationAmount.mul(USER_SHARE).div(100);
}

function calculateGenerationRate(
  lastDeposit: number,
  lastMint: number,
  targetTimestamp: number
): BigNumber {
  const SECONDS_PER_YEAR = BigNumber.from(365.25 * 24 * 3600);
  const MAX_BONUS_PERIOD_SECONDS_RAY = BigNumber.from(20 * 365.25 * 24 * 3600).mul(RAY);
  const MIN_STAKE_DURATION_SECONDS = BigNumber.from(90 * 24 * 3600);
  const GENERATION_BONUS_PER_SECOND = BigNumber.from('1584404390701447512');
  const RATE = BigNumber.from(2).mul(RAY);

  const blockTimestamp = BigNumber.from(targetTimestamp)
  const stakeTimeDifference = blockTimestamp.sub(lastDeposit);
  const mintTimeDifference = blockTimestamp.sub(lastMint);
  const timeDelta = rayDiv(
    mintTimeDifference.mul(WAD_RAY_RATIO),
    SECONDS_PER_YEAR.mul(WAD_RAY_RATIO),
  );

  // calculate long duration staking bonus
  if (stakeTimeDifference.gt(MIN_STAKE_DURATION_SECONDS)) {
    let bonusPeriod = stakeTimeDifference.sub(MIN_STAKE_DURATION_SECONDS).mul(RAY);
    if (bonusPeriod.gt(MAX_BONUS_PERIOD_SECONDS_RAY)) {
      bonusPeriod = MAX_BONUS_PERIOD_SECONDS_RAY;
    }

    return rayMul(
      RATE.add(rayMul(GENERATION_BONUS_PER_SECOND, bonusPeriod)),
      timeDelta,
    );
  }

  return rayMul(RATE, timeDelta);
}
