import { ethers } from "hardhat";
import { Signer } from "ethers";
import { expect } from "chai";
import { EcoFiToken, EcoFiToken__factory } from "../typechain";
import { parseEther } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Amounts } from "./util";

describe("EcoFiToken", function () {
  let ecoToken: EcoFiToken;

  let ecoMultisig: SignerWithAddress;
  let testAccount: SignerWithAddress;

  const sproutAddress = "0x1234567890123456789012345678901234567890";

  before(async function () {
    // setup accounts
    [ecoMultisig, testAccount] = await ethers.getSigners();

    // deploy EcoFiToken
    let ecoFiFactory = new EcoFiToken__factory(ecoMultisig);
    ecoToken = await ecoFiFactory.deploy(ecoMultisig.address);
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
    const token = ecoToken.connect(ecoMultisig);
    await token.transfer(await testAccount.getAddress(), Amounts._100_E18);

    const balance = await token.balanceOf(testAccount.address);
    expect(balance).to.equal(Amounts._100_E18);
  });

  it("correctly sets sprout address", async function() {
    const token = ecoToken.connect(ecoMultisig);
    const txPromise = token.setSproutAddress(sproutAddress);
    await expect(txPromise).to.not.be.reverted;
  });

  it("fails to transfer 10 ECO to sprout contract", async function () {
    const amount = Amounts._10_E18;
    const token = ecoToken.connect(ecoMultisig);

    // check user has balance for 10 ECO
    const balance = await token.balanceOf(ecoMultisig.address);
    expect(balance.gte(amount), "insufficient balance").to.be.true;

    // transfer 10 ECO to Sprout
    const txPromise = token.transfer(sproutAddress, amount);
    await expect(txPromise).to.be.reverted;
  });
});
