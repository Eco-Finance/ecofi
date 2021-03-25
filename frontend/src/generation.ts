import { BigNumber } from "ethers";

const WAD_RAY_RATIO = BigNumber.from(1e9);
const RAY = BigNumber.from(10).pow(27);

const MILLISECONDS = 1000;

function rayDiv(a: BigNumber, b: BigNumber) {
  return b.div(2).add(a.mul(RAY)).div(b);
}

function rayMul(a: BigNumber, b: BigNumber) {
  return RAY.div(2).add(a.mul(b)).div(RAY);
}

function calculateGenerationRate(
  lastDeposit: Date,
  lastMint: Date,
  daysOffset = 0
): BigNumber {
  const SECONDS_PER_YEAR = BigNumber.from(365.25 * 24 * 3600);

  const now = new Date();
  now.setTime(now.getTime() + daysOffset);

  const mintTimeDifference = BigNumber.from(
    now.getTime() - lastMint.getTime()
  ).div(MILLISECONDS);
  const timeDelta = rayDiv(
    mintTimeDifference.mul(WAD_RAY_RATIO),
    SECONDS_PER_YEAR.mul(WAD_RAY_RATIO)
  );

  return rayMul(rawGenerationRate(lastDeposit, daysOffset), timeDelta);
}

function rawGenerationRate(lastDeposit: Date, daysOffset = 0): BigNumber {
  const MAX_BONUS_PERIOD_SECONDS_RAY = BigNumber.from(
    20 * 365.25 * 24 * 3600
  ).mul(RAY);
  const MIN_STAKE_DURATION_SECONDS = BigNumber.from(90 * 24 * 3600);
  const GENERATION_BONUS_PER_SECOND = BigNumber.from("1584404390701447512");
  const RATE = BigNumber.from(2).mul(RAY);

  const now = new Date();
  now.setTime(now.getTime() + daysOffset);

  const generationPeriodTimeDifference = BigNumber.from(
    now.getTime() - lastDeposit.getTime()
  ).div(MILLISECONDS);

  if (generationPeriodTimeDifference.gt(MIN_STAKE_DURATION_SECONDS)) {
    let bonusPeriod = generationPeriodTimeDifference
      .sub(MIN_STAKE_DURATION_SECONDS)
      .mul(RAY);
    if (bonusPeriod.gt(MAX_BONUS_PERIOD_SECONDS_RAY)) {
      bonusPeriod = MAX_BONUS_PERIOD_SECONDS_RAY;
    }

    return RATE.add(rayMul(GENERATION_BONUS_PER_SECOND, bonusPeriod));
  }

  return RATE;
}

export function calculateTokenGeneration(
  stakeBalance: BigNumber,
  lastDeposit: Date,
  lastMint: Date,
  daysOffset = 0
): BigNumber {
  const USER_SHARE = 90;

  const generationAmount = rayMul(
    stakeBalance.mul(WAD_RAY_RATIO),
    calculateGenerationRate(lastDeposit, lastMint, daysOffset)
  ).div(WAD_RAY_RATIO);
  return generationAmount.mul(USER_SHARE).div(100);
}

export function generationRate(lastDeposit: Date): BigNumber {
  return rawGenerationRate(lastDeposit).div(WAD_RAY_RATIO);
}
