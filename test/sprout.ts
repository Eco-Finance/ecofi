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

  it("fails to transfer 10 ECO to sprout contract", async function () {
    const amount = Amounts._10_E18;
    const token = ecoToken.connect(ecoTestAccount);

    // check user has balance for 10 ECO
    const balance = await token.balanceOf(ecoTestAccount.address);
    expect(balance.gte(amount), "insufficient balance").to.be.true;

    // transfer 10 ECO to Sprout
    const txPromise = token.transfer(sproutToken.address, amount);
    await expect(txPromise).to.be.revertedWith(
      "EcoFiToken: transfer to sprout contract address (use transferFrom instead)"
    );
  });
});
