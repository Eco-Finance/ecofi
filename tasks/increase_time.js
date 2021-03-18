// This task is useful to debug the `stakeWithdraw` method of the sprout
// contract.
task("increase_time", "advance the time by 91 days")
  .setAction(async({}) => {
    await ethers.provider.send("evm_increaseTime", [7862400]);
    await ethers.provider.send("evm_mine", []);
  });
