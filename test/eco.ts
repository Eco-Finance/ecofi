import { ethers } from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { expect } from "chai";


describe("EcoFiToken", function () {
  let accounts: Signer[];
  let ecoToken: Contract;
  let transaction: any;
  let deployer: any;
  let eco_multisig: any;
  let test_account: any;

  before(async function() {
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    eco_multisig = accounts[1];
    test_account = accounts[2];
    // deploy EcoFiToken
    const EcoFiToken = await ethers.getContractFactory("EcoFiToken");
    ecoToken = await EcoFiToken.deploy(await eco_multisig.getAddress());

    let contract = await ecoToken.deployed();
    transaction = contract.deployTransaction;

    console.log("Deployed contract to ", ecoToken.address);
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

  it("Should have a total supply of 10,000,000 (*10^18)", async function() {


    expect(await ecoToken.totalSupply()).to.equal(BigNumber.from("10000000000000000000000000"));

  });



  it("Transfer 100 ECO to test account", async function() {

    transaction = await ecoToken.connect(eco_multisig).transfer(await test_account.getAddress(), BigNumber.from("1000000000000000000000"));

    expect(await ecoToken.decimals()).to.equal(18);

  });


});
