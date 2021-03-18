async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  // ethers is available in the global scope
  const [deployer, eco_multisig] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress(),
    "eco_multisig is:",
    await eco_multisig.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const EcoFiToken = await ethers.getContractFactory("EcoFiToken");
  const ecoToken = await EcoFiToken.deploy(await eco_multisig.getAddress());

  await ecoToken.deployed();

  console.log("Deployed ECO contract to ", ecoToken.address);

  const SproutToken = await ethers.getContractFactory("SproutToken");
  const sproutToken = await SproutToken.deploy(ecoToken.address, await eco_multisig.getAddress());

  await sproutToken.deployed();

  console.log("Deployed sprout contract to ", sproutToken.address);

  // Set sprout contract address in ECO contract (to prevent accidental transfer())
  await ecoToken.connect(deployer).setSproutAddress(sproutToken.address);
  console.log("Set SproutToken address in EcoFiToken contract");

  // We also save the contracts' artifacts and address in the frontend directory
  saveFrontendFiles(sproutToken, ecoToken);
}

function saveFrontendFiles(sproutToken, ecoToken) {
  const fs = require("fs");
  const contractsDir = __dirname + "/frontend/src/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/eco-contract-address.json",
    JSON.stringify({ EcoToken: ecoToken.address }, undefined, 2)
  );

  fs.writeFileSync(
    contractsDir + "/sprout-contract-address.json",
    JSON.stringify({ SproutToken: sproutToken.address }, undefined, 2)
  );

  fs.writeFileSync(
    contractsDir + "/EcoToken.json",
    JSON.stringify(artifacts.readArtifactSync("EcoFiToken"), null, 2)
  );

  fs.writeFileSync(
    contractsDir + "/SproutToken.json",
    JSON.stringify(artifacts.readArtifactSync("SproutToken"), null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
