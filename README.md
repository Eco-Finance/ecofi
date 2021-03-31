# README

*DRAFT* Should be thoroughly audited before production use !

The Sprout token contract allows anyone to mint SPRT by depositing/staking ECO
(for at least a minimum amount of time).

The generation reward is as follows:

- Flat 200% annual
- Linearly increasing annual generation bonus reaching 100% after 20 years
- Minimum 90 day lockup
- Note: lockup times (& bonuses) reset on any deposit (partial withdrawal is
  allowed without penalizing generation bonus of remaining amount)
- Sprout Generation distribution: 90% user, 5% EcoFi, 5% user reserve balance
  (user can get this once account is full withdrawn/unstaked; this is
  currently called reservePool but should probably be renamed)

## Developer Quickstart

### Install dependencies

```sh
yarn install
```

### Run local hardhat node (in another tab)

```sh
yarn hardhat node
```
This node is hosted on the port `8545` with chain ID `1337`.

### Deploy contracts

The deploy script deploys the two contracts on the node, then saves the
ABI and contract address as JSON files to the `frontend/contracts` folder.
Call with:

```sh
yarn hardhat run deploy.js --network localhost
```

### Run Frontend dev server

The frontend part was largely inspired by the
[hardhat-hackathon-boilerplate][boilerplate] repository.

The frontend requires the artifacts and contract addresses JSON files to be
generated first. This is done by the deploy script above.

To run a local server:

```sh
cd frontend
yarn install
yarn start
```
[boilerplate]: https://github.com/nomiclabs/hardhat-hackathon-boilerplate/tree/master/frontend

*NOTE: If using metamask for in browser testing, each time the hardhat node is started/reset you should reset the metamask account (to reset nonce etc) by going to the menu --> Settings --> Advanced --> Reset Account*

### Utility tasks

The scripts in the `tasks` folder serve to manipulate the hardhat node,
for developement purposes.

#### `increase_time`

This task increases the node time by 91 days, which is useful to manually
test the `stakeWithdraw` method of the sprout contract.

```sh
yarn hardhat --network localhost increase_time
```

#### `faucet`

This task takes an address as parameter, this address will receive 1 ETH
and 1,000 ECO tokens. Call with:

```sh
yarn hardhat --network localhost faucet <receiver>
```


## Compile solidity & docs only

This also generates the `typechain` bindings and the documentation using
[`hardhat-typechain`](https://hardhat.org/plugins/hardhat-typechain.html) and
[`hardhat-docgen`](https://hardhat.org/plugins/hardhat-docgen.html).

```sh
yarn hardhat compile
```

## Run tests

```sh
yarn hardhat test
```
