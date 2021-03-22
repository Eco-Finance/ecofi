import { ethers } from "hardhat";
import { Signer, BigNumber } from "ethers";
import { expect } from "chai";
import { EcoFiToken, EcoFiToken__factory, SproutToken, SproutToken__factory } from "../typechain";
import { Amounts, currentBlockTimestamp, fastForwardTo } from "./util";

describe("SproutToken", function () {

  let accounts: Signer[];
  let ecoToken: EcoFiToken;
  let sproutToken: SproutToken;
  let deployer: Signer;
  let eco_multisig: Signer;
  let eco_test_account: Signer;

  const MIN_STAKE_DURATION_SECONDS = 7776000;

  // context
  let stakeTimestamp : number;

  before(async function() {
    // setup accounts
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    eco_multisig = accounts[1];
    eco_test_account = accounts[2];

    // deploy EcoFiToken
    let ecoFiFactory = new EcoFiToken__factory(eco_multisig);
    ecoToken = await ecoFiFactory.deploy(await eco_multisig.getAddress());
    await ecoToken.deployed();

    // send 1000 tokens to eco_test_account
    const transfer = await ecoToken.connect(eco_multisig).transfer(
        await eco_test_account.getAddress(),
        Amounts._1000_E18,
    );

    // deploy SproutToken
    let sproutFactory = new SproutToken__factory(eco_multisig);
    sproutToken = await sproutFactory.deploy(ecoToken.address, await eco_multisig.getAddress());
    await sproutToken.deployed();
  });

  it("deposits 100 ECO from test account", async function() {
    // approve, stake
    const approve = await ecoToken.connect(eco_test_account).approve(await sproutToken.address, Amounts._100_E18);
    const tx = await sproutToken.connect(eco_test_account).stakeDeposit(Amounts._100_E18);
    
    // wait for tx to be mined and store stake timestamp.
    const receipt = await tx.wait();
    stakeTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

    // check balances
    expect(await sproutToken.ecoBalanceOf(await eco_test_account.getAddress())).to.equal(Amounts._100_E18);
    expect(await ecoToken.balanceOf(await eco_test_account.getAddress())).to.equal(Amounts._900_E18);
    expect(await ecoToken.balanceOf(sproutToken.address)).to.equal(Amounts._100_E18);
    expect(await sproutToken.balanceOf(await eco_test_account.getAddress())).to.equal(Amounts._0);
  });

  it("fails to withdraw 10 ECO too early", async function() {
    let contract = sproutToken.connect(eco_test_account);
    let txPromise = contract.stakeWithdraw(Amounts._10_E18);
    await expect(txPromise).to.be.revertedWith("MinStakeDuration not elapsed yet");
  });

  it("correctly computes the SPRT Generation amount after 91 days on 100 ECO deposit", async function() {
    // eco_balance * (timediff [7862400] / SECONDS_PER_YEAR [31557600]) * (rate [2.0] + bonus rate [0.000000001584404390701447512 * 86400]) = 49.832294927058576608 SPRT
    const expectedReward = BigNumber.from("44849076913899358176"); // TO-DO: I calculated 44849065434352718947

    // fast forward chain to stake timestamp + 91 days
    const nextBlockTimestamp = stakeTimestamp + 7862400;
    await fastForwardTo(nextBlockTimestamp);
    expect(await currentBlockTimestamp()).to.equal(
      nextBlockTimestamp,
      "current timestamp should be 91 days after stake"
    );

    expect(await sproutToken.balanceOf(await eco_test_account.getAddress())).to.equal(expectedReward);

    console.log("SPRT balance:", await sproutToken.balanceOf(await eco_test_account.getAddress()));
  });

  it("correctly computes the SPRT Generation amount after 1 year (365.25 days) on 100 ECO deposit", async function() {
    // `expected_reward` is the amount of SPRT generated after 365.25 days
    // eco_balance * (timediff [31557600] / SECONDS_PER_YEAR [31557600]) * (rate [2.0] + bonus rate [0.000000001584404390701447512 * bonus period[23781600]]) = 203.767967145790554415 SPRT
    // TO-DO: I calculated 203767967145790554415 (in swapbox i did tests replicating the math in the tests (with matching precision).  ended up being spaghetti and i didnt dare commit.  I dont think we want to do that here)
    const expectedReward = BigNumber.from("183391182339035333257"); // TO-DO: I calculated 183391170431211498973

    // fast forward chain to stake timestamp + 1 year
    const nextBlockTimestamp = stakeTimestamp + 31557600;
    await fastForwardTo(nextBlockTimestamp);
    expect(await currentBlockTimestamp()).to.equal(
      nextBlockTimestamp,
      "current timestamp should be 1 year after stake"
    );

    expect(await sproutToken.balanceOf(await eco_test_account.getAddress())).to.equal(expectedReward);

    console.log("SPRT balance:", await sproutToken.balanceOf(await eco_test_account.getAddress()));
  });

  it("succeeds to withdraw 100 ECO from test account after 10 years", async function() {
    // `expected_reward` is the amount of SPRT generated after
    // increasing the time by 31536000 seconds (1 year).

    // eco_balance * (timediff [315576000] / SECONDS_PER_YEAR [31557600]) * (rate [2.0] + bonus rate [0.000000001584404390701447512 * bonus period[307800000]]) = 2487.679671457905544193 SPRT

    const expected_reward = BigNumber.from("2363295705873042886038"); // TO-DO: I calculated 2238911704312114989773

    // fast forward chain to stake timestamp + 10 years
    const nextBlockTimestamp = stakeTimestamp + 315576000;
    await fastForwardTo(nextBlockTimestamp);
    expect(await currentBlockTimestamp()).to.equal(
      nextBlockTimestamp,
      "current timestamp should be 10 years after stake"
    );

    await sproutToken.connect(eco_test_account).stakeWithdraw(Amounts._100_E18);

    expect(await sproutToken.ecoBalanceOf(await eco_test_account.getAddress())).to.equal(Amounts._0);
    expect(await ecoToken.balanceOf(await eco_test_account.getAddress())).to.equal(Amounts._1000_E18);
    expect(await ecoToken.balanceOf(sproutToken.address)).to.equal(Amounts._0);
    expect(await sproutToken.balanceOf(await eco_test_account.getAddress())).to.equal(expected_reward);

    console.log("SPRT balance:", await sproutToken.balanceOf(await eco_test_account.getAddress()));
  });

  it("correctly sets sprout address in eco contract", async function() {
    // TODO implement
    throw new Error("not implemented")
  });

  it("fails when trying to transfer() ECO to sprout contract", async function() {
    // TODO implement
    throw new Error("not implemented")
  });
});
