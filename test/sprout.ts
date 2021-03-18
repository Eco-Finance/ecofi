import { ethers } from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { expect } from "chai";


describe("SproutToken", function () {
  const _10_E18 = BigNumber.from("10000000000000000000")
  const _100_E18 = BigNumber.from("100000000000000000000")
  const _1000_E18 = BigNumber.from("1000000000000000000000")
  const _900_E18 = BigNumber.from("900000000000000000000")
  const _0 = BigNumber.from("0")

  let accounts: Signer[];
  let ecoToken: Contract;
  let sproutToken: Contract;
  let transaction: any;
  let deployer: Signer;
  let eco_multisig: Signer;
  let eco_test_account: Signer;

  before(async function() {
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    eco_multisig = accounts[1];
    eco_test_account = accounts[2];
    // deploy EcoFiToken
    const EcoFiToken = await ethers.getContractFactory("EcoFiToken");
    ecoToken = await EcoFiToken.deploy(await eco_multisig.getAddress());

    await ecoToken.deployed();
    console.log("Deployed ECO contract to ", ecoToken.address);

    // send 1000 tokens to eco_test_account
    const transfer = await ecoToken.connect(eco_multisig).transfer(
        await eco_test_account.getAddress(),
        _1000_E18,
    );

    // deploy SproutToken
    const SproutToken = await ethers.getContractFactory("SproutToken");
    sproutToken = await SproutToken.deploy(ecoToken.address, await eco_multisig.getAddress());

    let contract = await sproutToken.deployed();
    transaction = contract.deployTransaction;
    console.log("Deployed SPRT contract to ", sproutToken.address);

  });

  // Show gasUsed & blockNumber & blockTimestamp for each test transaction
  afterEach(async () => {
    try {
      const receipt = await transaction.wait();
      const block = await ethers.provider.send("eth_getBlockByHash", [receipt.blockHash, false]);
      const blockTimestamp = BigNumber.from(block.timestamp).toString();
      console.log(JSON.stringify({gasUsed: receipt.gasUsed.toString(), blockNumber: receipt.blockNumber, blockTime: blockTimestamp}));
    } catch (e) {
      console.log(e);
      // transaction hasnt passed, so no receipt, nothing to show.
    }
  });


  it("Deposit 100 ECO from test account", async function() {

    const approve = await ecoToken.connect(eco_test_account).approve(await sproutToken.address, _100_E18);
    transaction = await sproutToken.connect(eco_test_account).stakeDeposit(_100_E18);

    expect(await sproutToken.ecoBalanceOf(await eco_test_account.getAddress())).to.equal(_100_E18);
    expect(await ecoToken.balanceOf(await eco_test_account.getAddress())).to.equal(_900_E18);
    expect(await ecoToken.balanceOf(sproutToken.address)).to.equal(_100_E18);
    expect(await sproutToken.balanceOf(await eco_test_account.getAddress())).to.equal(_0);

    console.log("SPRT balance:", (await sproutToken.balanceOf(await eco_test_account.getAddress())).toString());
  });


  it("Withdraw 10 ECO immediatley (should fail)", async function() {

    await expect(sproutToken.connect(eco_test_account).stakeWithdraw(_10_E18)).to.be.revertedWith("MinStakeDuration not elapsed yet");

  });

  it("SPRT Generation amount after 91 days on 100 ECO deposit", async function() {
    // `expected_reward` is the amount of SPRT generated after
    // increasing the time by 7862400 seconds (91 days [1 day bonus period]).

    // eco_balance * (timediff [7862400] / SECONDS_PER_YEAR [31557600]) * (rate [2.0] + bonus rate [0.000000001584404390701447512 * 86400]) = 49.832294927058576608 SPRT
    const expected_reward = BigNumber.from("44849076913899358176"); // TO-DO: I calculated 44849065434352718947

    // fast forward chain by 91 days
    await ethers.provider.send("evm_increaseTime", [7862400]);// .evm_increaseTime(7776000);

    // as there is no transaction in this test we need to mine a block
    await ethers.provider.send("evm_mine", []);

    expect(await sproutToken.balanceOf(await eco_test_account.getAddress())).to.equal(expected_reward);

    console.log("SPRT balance:", await sproutToken.balanceOf(await eco_test_account.getAddress()));
  });

  it("SPRT Generation amount after 1 year (365.25 days) on 100 ECO deposit", async function() {
    // `expected_reward` is the amount of SPRT generated after
    // increasing the time by 31536000 seconds (1 year).

    // eco_balance * (timediff [31557600] / SECONDS_PER_YEAR [31557600]) * (rate [2.0] + bonus rate [0.000000001584404390701447512 * bonus period[23781600]]) = 203.767967145790554415 SPRT

    // TO-DO: I calculated 203767967145790554415 (in swapbox i did tests replicating the math in the tests (with matching precision).  ended up being spaghetti and i didnt dare commit.  I dont think we want to do that here)
    const expected_reward = BigNumber.from("183391182339035333257"); // TO-DO: I calculated 183391170431211498973

    // fast forward chain by 365.25 days (minus 91 days above)
    await ethers.provider.send("evm_increaseTime", [23695200]);  // 31557600 - 7862400

    // as there is no transaction in this test we need to mine a block
    await ethers.provider.send("evm_mine", []);

    expect(await sproutToken.balanceOf(await eco_test_account.getAddress())).to.equal(expected_reward);

    console.log("SPRT balance:", await sproutToken.balanceOf(await eco_test_account.getAddress()));
  });


  it("Withdraw 100 ECO from test account (after 10yrs)", async function() {
    // `expected_reward` is the amount of SPRT generated after
    // increasing the time by 31536000 seconds (1 year).

    // eco_balance * (timediff [315576000] / SECONDS_PER_YEAR [31557600]) * (rate [2.0] + bonus rate [0.000000001584404390701447512 * bonus period[307800000]]) = 2487.679671457905544193 SPRT

    const expected_reward = BigNumber.from("2363295705873042886038"); // TO-DO: I calculated 2238911704312114989773

    // fast forward chain by 3652.5 days (minus 365.25 days above)
    await ethers.provider.send("evm_increaseTime", [284018400]); // 315576000 - 31557600

    transaction = await sproutToken.connect(eco_test_account).stakeWithdraw(_100_E18);

    expect(await sproutToken.ecoBalanceOf(await eco_test_account.getAddress())).to.equal(_0);
    expect(await ecoToken.balanceOf(await eco_test_account.getAddress())).to.equal(_1000_E18);
    expect(await ecoToken.balanceOf(sproutToken.address)).to.equal(_0);
    expect(await sproutToken.balanceOf(await eco_test_account.getAddress())).to.equal(expected_reward);

    console.log("SPRT balance:", await sproutToken.balanceOf(await eco_test_account.getAddress()));
  });

  it("Set sprout address in eco contract (to prevent accidental transfer() to sprout contract)", async function() {

    transaction = await ecoToken.connect(deployer).setSproutAddress(sproutToken.address);

    expect(await ecoToken.decimals()).to.equal(18);

  });

  it("Should fail when trying to transfer() ECO to sprout contract", async function() {

    transaction = await ecoToken.connect(eco_test_account).transfer(sproutToken.address, _10_E18);

    expect(await ecoToken.decimals()).to.equal(18);

  });


});
