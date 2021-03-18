// This file was taken from
// https://github.com/nomiclabs/hardhat-hackathon-boilerplate/blob/master/tasks/faucet.js
// and adapted to this project.

const fs = require("fs");

task("faucet", "Sends ETH and tokens to an address")
  .addPositionalParam("receiver", "The address that will receive them")
  .setAction(async ({ receiver }) => {
    if (network.name === "hardhat") {
      console.warn(
        "You are running the faucet task with Hardhat network, which" +
          "gets automatically created and destroyed every time. Use the Hardhat" +
          " option '--network localhost'"
      );
    }

    const addressesFile =
      __dirname + "/../frontend/src/contracts/eco-contract-address.json";

    if (!fs.existsSync(addressesFile)) {
      console.error("You need to deploy your contract first");
      return;
    }

    const addressJson = fs.readFileSync(addressesFile);
    const address = JSON.parse(addressJson);

    if ((await ethers.provider.getCode(address.EcoToken)) === "0x") {
      console.error("You need to deploy your contract first");
      return;
    }

    const token = await ethers.getContractAt("EcoFiToken", address.EcoToken);
    const [_, eco_multisig] = await ethers.getSigners();

    const tx = await token.connect(eco_multisig)
      .transfer(
        await receiver,
        ethers.BigNumber.from("1000000000000000000000"),
      );
    await tx.wait();

    const tx2 = await eco_multisig.sendTransaction({
      to: receiver,
      value: ethers.constants.WeiPerEther,
    });
    await tx2.wait();

    console.log(`Transferred 1 ETH and 1,000E18 tokens to ${receiver}`);
  });
