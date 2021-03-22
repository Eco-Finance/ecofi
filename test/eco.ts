import { ethers } from "hardhat";
import { Signer } from "ethers";
import { expect } from "chai";
import { EcoFiToken, EcoFiToken__factory } from "../typechain";
import { parseEther } from "ethers/lib/utils";

describe("EcoFiToken", function () {
  let accounts: Signer[];
  let ecoToken: EcoFiToken;
  let deployer: any;
  let eco_multisig: any;
  let test_account: any;

  before(async function () {
    // setup accounts
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    eco_multisig = accounts[1];
    test_account = accounts[2];

    // deploy EcoFiToken
    let ecoFiFactory = new EcoFiToken__factory(eco_multisig);
    ecoToken = await ecoFiFactory.deploy(await eco_multisig.getAddress());
    await ecoToken.deployed();
  });

  it("has 18 decimals", async function () {
    expect(await ecoToken.decimals()).to.equal(18);
  });

  it("has a total supply of 10,000,000 (*10^18)", async function () {
    const totalSupply = Amounts._10_E18.mul(10000000);
    expect(await ecoToken.totalSupply()).to.equal(totalSupply);
  });

  it("transfers 100 ECO to test account", async function () {
    const amount = Amounts._10_E18.mul(100);
    const contract = await ecoToken.connect(eco_multisig);
    const tx = contract.transfer(await test_account.getAddress(), amount);
    //TODO: check balance
    throw new Error("not implemented")
  });
});
