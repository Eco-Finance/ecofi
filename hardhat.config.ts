import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
import "hardhat-gas-reporter";

require('hardhat-docgen');

require("./tasks/faucet");
require("./tasks/increase_time");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  solidity: "0.7.3",

  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  }
};
