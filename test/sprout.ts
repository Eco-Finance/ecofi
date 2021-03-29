import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";
import {
  EcoFiToken,
  EcoFiToken__factory,
  SproutToken,
  SproutToken__factory,
} from "../typechain";
import {
  Amounts,
  currentBlockTimestamp,
  fastForwardTo,
  calculateTokenGeneration,
  RAY,
  SECONDS_IN_A_DAY,
  closeTo,
} from "./util";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("SproutToken", function () {
  let ecoToken: EcoFiToken;
  let sproutToken: SproutToken;
  let ecoMultisig: SignerWithAddress;
  let ecoTestAccount: SignerWithAddress;

  // context
  let stakeBalance: BigNumber;
  let stakeDepositTimestamp: number;

  let snapshot: number;

  before(async function () {
    // setup accounts
    [ecoMultisig, ecoTestAccount] = await ethers.getSigners();

    // deploy EcoFiToken
    let ecoFiFactory = new EcoFiToken__factory(ecoMultisig);
    ecoToken = await ecoFiFactory.deploy(ecoMultisig.address);
    await ecoToken.deployed();

    // send 1000 tokens to eco_test_account
    await ecoToken
      .connect(ecoMultisig)
      .transfer(ecoTestAccount.address, Amounts._1000_E18);

    // deploy SproutToken
    let sproutFactory = new SproutToken__factory(ecoMultisig);
    sproutToken = await sproutFactory.deploy(
      ecoToken.address,
      ecoMultisig.address
    );
    await sproutToken.deployed();
  });

  it("deposits 100 ECO from test account", async function () {
    // approve, stake
    await ecoToken
      .connect(ecoTestAccount)
      .approve(sproutToken.address, Amounts._100_E18);
    const tx = await sproutToken
      .connect(ecoTestAccount)
      .stakeDeposit(Amounts._100_E18);

    // wait for tx to be mined and store stake timestamp.
    const receipt = await tx.wait();
    stakeDepositTimestamp = (
      await ethers.provider.getBlock(receipt.blockNumber)
    ).timestamp;
    stakeBalance = Amounts._100_E18;

    // check balances
    expect(await sproutToken.ecoBalanceOf(ecoTestAccount.address)).to.equal(
      Amounts._100_E18
    );
    expect(await ecoToken.balanceOf(ecoTestAccount.address)).to.equal(
      Amounts._900_E18
    );
    expect(await ecoToken.balanceOf(sproutToken.address)).to.equal(
      Amounts._100_E18
    );
    expect(await sproutToken.balanceOf(ecoTestAccount.address)).to.equal(
      Amounts._0
    );

    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  it("fails to withdraw 10 ECO too early", async function () {
    let contract = sproutToken.connect(ecoTestAccount);
    let txPromise = contract.stakeWithdraw(Amounts._10_E18);
    await expect(txPromise).to.be.revertedWith(
      "MinStakeDuration not elapsed yet"
    );
  });

  it("generates correct extrapolation info", async function () {
    // check user info equal what we expect
    const account = await sproutToken.generationExtrapolationInformation(
      ecoTestAccount.address
    );
    const lastDeposit = stakeDepositTimestamp;
    const lastMint = stakeDepositTimestamp;
    expect(account.stakeBalance).to.equal(stakeBalance);
    expect(account.lastDeposit).to.equal(lastDeposit);
    expect(account.lastMint).to.equal(lastMint);
  });

  it("correctly computes the SPRT Generation amount", async function () {
    const lastDeposit = stakeDepositTimestamp;
    const lastMint = stakeDepositTimestamp;

    // different timetamps to check
    const timeStopsDays = [91, 365.25, 3652.25];

    for (const timeStop of timeStopsDays) {
      // fast forward chain to stake timestamp + timestop
      const nextBlockTimestamp =
        stakeDepositTimestamp + timeStop * SECONDS_IN_A_DAY;
      await fastForwardTo(nextBlockTimestamp);
      expect(
        await currentBlockTimestamp(),
        "current timestamp should be " + timeStop + " days after initial stake"
      ).to.equal(nextBlockTimestamp);

      // check balance (with interest) equal the expected reward.
      const expectedReward = calculateTokenGeneration(
        stakeBalance,
        lastDeposit,
        lastMint,
        nextBlockTimestamp
      );
      const sprtBalance = await sproutToken.balanceOf(ecoTestAccount.address);
      expect(
        closeTo(sprtBalance, expectedReward, 1),
        "SPRT is not correct after " + timeStop + " days"
      ).to.be.true;
    }
  });

  it("computes the raw generation rate", async function () {
    await ethers.provider.send("evm_revert", [snapshot]);

    const lastDeposit = stakeDepositTimestamp;
    const YEAR = 365.25;
    const RATE = RAY.mul(2);

    // Computed values between 90 days and 20 years with WolframAlpha using
    // the following input:
    // 2e27 + (1e27/2 + 1584404390701447512 * (t - 7776000) * 1e27) / 1e27
    //
    // The expected cap at 20 years was expected to be 3*10e27; it's a bit
    // higher but not by much so the value used by the test was empirically
    // determined.
    const testCases: {
      after: number;
      expected: BigNumber;
    }[] = [
      {after: 4, expected: RATE},
      {after: 89, expected: RATE},
      {after: 91, expected: BigNumber.from('4000273785078713210130073601').div(2)},
      {after: YEAR , expected: BigNumber.from('4075359342915811088302758401').div(2)},
      {after: YEAR * 10, expected: BigNumber.from('4975359342915811088387200001').div(2)},
      {after: YEAR * 20, expected: BigNumber.from('5975359342915811088481024001').div(2)},
      {after: YEAR * 30, expected: BigNumber.from('3000000000000000000093824000')},
      {after: YEAR * 40, expected: BigNumber.from('3000000000000000000093824000')},
    ];

    for (const testCase of testCases) {
      // fast forward chain to stake timestamp + testCase.after
      const nextBlockTimestamp =
        stakeDepositTimestamp + testCase.after * SECONDS_IN_A_DAY;
      await fastForwardTo(nextBlockTimestamp);
      expect(
        await currentBlockTimestamp(),
        `current timestamp should be ${testCase.after} days after initial stake`
      ).to.equal(nextBlockTimestamp);

      const rawGenerationRate = await sproutToken.rawGenerationRate(RATE, lastDeposit);
      expect(rawGenerationRate,
        `incorrect generation rate after ${testCase.after}`
      ).to.equal(testCase.expected);
    }
  });
});
