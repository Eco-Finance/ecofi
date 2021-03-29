import React from "react";

// We'll use ethers to interact with the Ethereum network and our contract
import { BigNumber, BigNumberish, ethers } from "ethers";

// We import the contract's artifacts and address here, as we are going to be
// using them with ethers
import SproutTokenArtifact from "../contracts/SproutToken.json";
import SproutContractAddress from "../contracts/sprout-contract-address.json";

import EcoTokenArtifact from "../contracts/EcoToken.json";
import EcoContractAddress from "../contracts/eco-contract-address.json";

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { Transfer } from "./Transfer";
import { StakeDeposit } from "./StakeDeposit";
import { StakeWithdraw } from "./StakeWithdraw";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";

import { generationRate, calculateTokenGeneration } from "../generation";

// This is the Hardhat Network id, you might change it in the hardhat.config.js
// Here's a list of network ids https://docs.metamask.io/guide/ethereum-provider.html#properties
// to use when deploying to other networks.
const HARDHAT_NETWORK_ID = "1337";

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

// Declare a property `ethereum` on the window global variable. This is
// mandatory since the user's wallet will create it for us.
// https://stackoverflow.com/questions/56457935/typescript-error-property-x-does-not-exist-on-type-window
declare global {
  interface Window {
    ethereum: any;
  }
}

interface ContractData {
  name: string;
  symbol: string;
  decimals: BigNumber;
}

interface Props {
  sproutToken: ethers.Contract;
  ecoToken: ethers.Contract;
  provider: ethers.providers.Web3Provider;
  sproutTokenData: ContractData;
  ecoTokenData: ContractData;
  selectedAddress: string;
}

interface State {
  // The user's address and balance
  sproutBalance: BigNumber;
  displayedBalances: {
    current: BigNumber;
    in90days: BigNumber;
    in10years: BigNumber;
  };
  liveGenerationRate: BigNumber;
  stakeBalance: BigNumber;
  ecoBalance: BigNumber;
  lastDeposit: Date;
  lastMint: Date;
  blockOffset: number;
  // The ID about transactions being sent, and any possible error with them
  txBeingSent?: string;
  transactionError?: Error;
}

export class Contracts extends React.Component<Props, State> {
  _extrapolationInterval?: ReturnType<typeof setInterval>;

  constructor(props: Props) {
    super(props);

    this.state = {
      sproutBalance: BigNumber.from(0),
      displayedBalances: {
        current: BigNumber.from(0),
        in90days: BigNumber.from(0),
        in10years: BigNumber.from(0),
      },
      liveGenerationRate: BigNumber.from(0),
      stakeBalance: BigNumber.from(0),
      ecoBalance: BigNumber.from(0),
      lastDeposit: new Date(),
      lastMint: new Date(),
      blockOffset: 0,
    };
  }

  render(): React.ReactNode {
    const DEFAULT_DECIMALS_SHOWN = 4;

    const formatBalance = (
      balance: BigNumber,
      symbol: string,
      decimalsShown: number = DEFAULT_DECIMALS_SHOWN
    ): string => {
      const formatNumber = (): string => {
        const value = balance
          .div(BigNumber.from(10).pow(this.props.sproutTokenData.decimals))
          .toString();

        if (decimalsShown === 0) {
          return `${value}`;
        }

        const balanceString = balance.toString();

        if (balance.gt(BigNumber.from(10).pow(18))) {
          const len = value.length;
          return `${balanceString.slice(0, len)}.${balanceString.slice(
            len,
            len + decimalsShown
          )}`;
        }

        const padded = balanceString.padStart(18, "0");

        return `0.${padded.slice(0, decimalsShown)}`;
      };

      return `${formatNumber()} ${symbol}`;
    };

    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h1>
              {this.props.sproutTokenData.name} (
              {this.props.sproutTokenData.symbol})
            </h1>
            <p>
              Welcome <b>{this.props.selectedAddress}</b>, you staked{" "}
              <b>
                {formatBalance(
                  this.state.stakeBalance,
                  this.props.ecoTokenData.symbol,
                  0
                )}
              </b>{" "}
              which are now worth{" "}
              <b>
                {formatBalance(
                  this.state.displayedBalances.current,
                  this.props.sproutTokenData.symbol,
                  8
                )}
              </b>
              , will be worth{" "}
              <b>
                {formatBalance(
                  this.state.displayedBalances.in90days,
                  this.props.sproutTokenData.symbol
                )}
              </b>{" "}
              in 90 days and{" "}
              <b>
                {formatBalance(
                  this.state.displayedBalances.in10years,
                  this.props.sproutTokenData.symbol
                )}
              </b>{" "}
              in 10 years. You have{" "}
              <b>
                {formatBalance(
                  this.state.ecoBalance,
                  this.props.ecoTokenData.symbol,
                  0
                )}
              </b>{" "}
              you can stake.
            </p>
            <p>
              Live generation rate:{" "}
              <b>
                {formatBalance(this.state.liveGenerationRate.mul(100), "%", 2)}
              </b>
              .
            </p>
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-12">
            {/*
              Sending a transaction isn't an immidiate action. You have to wait
              for it to be mined.
              If we are waiting for one, we show a message here.
            */}
            {this.state.txBeingSent && (
              <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
            )}

            {/*
              Sending a transaction can fail in multiple ways.
              If that happened, we show a message here.
            */}
            {this.state.transactionError && (
              <TransactionErrorMessage
                message={this.state.transactionError.message}
                dismiss={() => this._dismissTransactionError()}
              />
            )}
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <StakeDeposit
              stakeDeposit={(amount) => this._stakeDeposit(amount)}
              tokenSymbol={this.props.ecoTokenData.symbol}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <StakeWithdraw
              stakeWithdraw={(amount) => this._stakeWithdraw(amount)}
              tokenSymbol={this.props.ecoTokenData.symbol}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <Transfer
              transferTokens={(to, amount) =>
                this._transferTokens(this.props.sproutToken, to, amount)
              }
              tokenSymbol={this.props.sproutTokenData.symbol}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <Transfer
              transferTokens={(to, amount) =>
                this._transferTokens(this.props.ecoToken, to, amount)
              }
              tokenSymbol={this.props.ecoTokenData.symbol}
            />
          </div>
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    this._updateBalance().then(() => {
      this._startExtrapolatingBalance();
    });
  }

  _startExtrapolatingBalance(): void {
    this._extrapolationInterval = setInterval(
      () => this._extrapolateBalance(),
      1000
    );
    this._extrapolateBalance();
  }

  componentWillUnmount(): void {
    this._stopExtrapolating();
  }

  _stopExtrapolating(): void {
    if (this._extrapolationInterval) {
      clearInterval(this._extrapolationInterval);
      this._extrapolationInterval = undefined;
    }
  }

  _extrapolateBalance(): void {
    // In milliseconds.
    const _90DAYS = 91 * 24 * 3600 * 1000;
    const _10YEARS = 10 * 365.25 * 24 * 3600 * 1000;

    const displayedBalances = {
      current: this.state.sproutBalance,
      in90days: this.state.sproutBalance,
      in10years: this.state.sproutBalance,
    };

    let liveGenerationRate = BigNumber.from(0);

    if (this.state.stakeBalance.gt(0)) {
      const current = calculateTokenGeneration(
        this.state.stakeBalance,
        this.state.lastDeposit,
        this.state.lastMint,
        this.state.blockOffset
      );

      const in90days = calculateTokenGeneration(
        this.state.stakeBalance,
        this.state.lastDeposit,
        this.state.lastMint,
        this.state.blockOffset,
        _90DAYS
      );

      const in10years = calculateTokenGeneration(
        this.state.stakeBalance,
        this.state.lastDeposit,
        this.state.lastMint,
        this.state.blockOffset,
        _10YEARS
      );

      displayedBalances.current = displayedBalances.current.add(current);
      displayedBalances.in90days = displayedBalances.in90days.add(in90days);
      displayedBalances.in10years = displayedBalances.in10years.add(in10years);

      liveGenerationRate = generationRate(
        this.state.lastDeposit,
        this.state.blockOffset
      );
    }

    this.setState({
      displayedBalances: displayedBalances,
      liveGenerationRate: liveGenerationRate,
    });
  }

  async _updateBalance(): Promise<void> {
    const ecoBalance = await this.props.ecoToken.balanceOf(
      this.props.selectedAddress
    );
    const [
      sproutBalance,
      stakeBalance,
      lastDepositTimestamp,
      lastMintTimestamp,
      blockTimestamp,
    ] = await this.props.sproutToken.generationExtrapolationInformation(
      this.props.selectedAddress
    );

    const displayedBalances = {
      current: sproutBalance,
      in90days: sproutBalance,
      in10years: sproutBalance,
    };

    // Received timestamps are in seconds, they must be converted to milliseconds.
    const lastDeposit = new Date(lastDepositTimestamp.mul(1000).toNumber());
    const lastMint = new Date(lastMintTimestamp.mul(1000).toNumber());

    const blockOffset =
      blockTimestamp.mul(1000).toNumber() - new Date().getTime();

    this.setState({
      sproutBalance,
      stakeBalance,
      ecoBalance,
      displayedBalances,
      lastDeposit,
      lastMint,
      blockOffset,
    });
  }

  // This method sends an ethereum transaction to transfer tokens.
  // While this action is specific to this application, it illustrates how to
  // send a transaction.
  async _transferTokens(
    token: ethers.Contract,
    to: string,
    amount: BigNumberish
  ): Promise<void> {
    this._sendTransaction(0, () => {
      return token.transfer(
        to,
        BigNumber.from(amount).mul(
          BigNumber.from(10).pow(this.props.sproutTokenData.decimals)
        )
      );
    });
  }

  async _stakeDeposit(amount: BigNumberish): Promise<void> {
    this._sendTransaction(amount, () => {
      return this.props.sproutToken.stakeDeposit(
        BigNumber.from(amount).mul(
          BigNumber.from(10).pow(this.props.sproutTokenData.decimals)
        )
      );
    });
  }

  async _stakeWithdraw(amount: BigNumberish): Promise<void> {
    this._sendTransaction(0, () => {
      return this.props.sproutToken.stakeWithdraw(
        BigNumber.from(amount).mul(
          BigNumber.from(10).pow(this.props.sproutTokenData.decimals)
        )
      );
    });
  }

  async _sendTransaction(
    approvalAmount: BigNumberish,
    transaction_function: () => Promise<ethers.ContractTransaction>
  ): Promise<void> {
    // Sending a transaction is a complex operation:
    //   - The user can reject it
    //   - It can fail before reaching the ethereum network (i.e. if the user
    //     doesn't have ETH for paying for the tx's gas)
    //   - It has to be mined, so it isn't immediately confirmed.
    //     Note that some testing networks, like Hardhat Network, do mine
    //     transactions immediately, but your dapp should be prepared for
    //     other networks.
    //   - It can fail once mined.
    //
    // This method handles all of those things, so keep reading to learn how to
    // do it.

    try {
      // If a transaction fails, we save that error in the component's state.
      // We only save one such error, so before sending a second transaction, we
      // clear it.
      this._dismissTransactionError();

      if (approvalAmount > 0) {
        const approve = await this.props.ecoToken.approve(
          this.props.sproutToken.address,
          BigNumber.from(approvalAmount).mul(
            BigNumber.from(10).pow(this.props.ecoTokenData.decimals)
          )
        );

        if (approve.status === 0) {
          throw new Error("Approval failed");
        }
      }

      // We send the transaction, and save its hash in the Dapp's state. This
      // way we can indicate that we are waiting for it to be mined.
      const tx = await transaction_function();
      this.setState({ txBeingSent: tx.hash });

      // We use .wait() to wait for the transaction to be mined. This method
      // returns the transaction's receipt.
      const receipt = await tx.wait();

      // The receipt, contains a status flag, which is 0 to indicate an error.
      if (receipt.status === 0) {
        // We can't know the exact error that make the transaction fail once it
        // was mined, so we throw this generic one.
        throw new Error("Transaction failed");
      }

      // If we got here, the transaction was successful, so you may want to
      // update your state. Here, we update the user's balance.
      await this._updateBalance();
    } catch (error) {
      // We check the error code to see if this error was produced because the
      // user rejected a tx. If that's the case, we do nothing.
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // Other errors are logged and stored in the Dapp's state. This is used to
      // show them to the user, and for debugging.
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      this.setState({ txBeingSent: undefined });
    }
  }

  // This method just clears part of the state.
  _dismissTransactionError(): void {
    this.setState({ transactionError: undefined });
  }
}

interface DappState {
  networkError?: string;
  sproutToken?: ethers.Contract;
  ecoToken?: ethers.Contract;
  provider?: ethers.providers.Web3Provider;
  selectedAddress?: string;
  sproutTokenData?: ContractData;
  ecoTokenData?: ContractData;
}

// This component is in charge of doing these things:
//   1. It connects to the user's wallet
//   2. Initializes ethers and the Token contract
//   3. Polls the user balance to keep it updated.
//   4. Transfers tokens by sending transactions
//   5. Renders the whole application
//
// Note that (3) and (4) are specific of this sample application, but they show
// you how to keep your Dapp and contract's state in sync,  and how to send a
// transaction.
export class Dapp extends React.Component<Record<string, never>, DappState> {
  constructor(props: Record<string, never>) {
    super(props);

    this.state = {
      networkError: undefined,
    };
  }

  render(): React.ReactNode {
    // Ethereum wallets inject the window.ethereum object. If it hasn't been
    // injected, we instruct the user to install MetaMask.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    // The next thing we need to do, is to ask the user to connect their wallet.
    // When the wallet gets connected, we are going to save the user's address
    // in the component's state. So, if it hasn't been saved yet, we have
    // to show the ConnectWallet component.
    //
    // Note that we pass it a callback that is going to be called when the user
    // clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    if (
      !this.state.sproutToken ||
      !this.state.ecoToken ||
      !this.state.provider ||
      !this.state.selectedAddress ||
      !this.state.sproutTokenData ||
      !this.state.ecoTokenData
    ) {
      return <Loading />;
    }

    // If everything is loaded, we render the application.
    return (
      <Contracts
        sproutToken={this.state.sproutToken}
        ecoToken={this.state.ecoToken}
        provider={this.state.provider}
        sproutTokenData={this.state.sproutTokenData}
        ecoTokenData={this.state.ecoTokenData}
        selectedAddress={this.state.selectedAddress}
      />
    );
  }

  async _connectWallet(): Promise<void> {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.enable();

    // Once we have the address, we can initialize the application.

    // First we check the network
    if (!this._checkNetwork()) {
      return;
    }

    this._initialize(selectedAddress);

    // We reinitialize it whenever the user changes their account.
    window.ethereum.on("accountsChanged", (newAddress: string) => {
      // `accountsChanged` event can be triggered with an undefined newAddress.
      // This happens when the user removes the Dapp from the "Connected
      // list of sites allowed access to your addresses" (Metamask > Settings > Connections)
      // To avoid errors, we reset the dapp state
      if (newAddress === undefined) {
        this._resetState();
        return;
      }

      this._initialize(newAddress);
    });

    // We reset the dapp state if the network is changed
    window.ethereum.on("chainChanged", () => {
      this._resetState();
    });
  }

  _initialize(userAddress: string): void {
    // This method initializes the dapp

    // We first store the user's address in the component's state
    this.setState({
      selectedAddress: userAddress,
    });

    // Then, we initialize ethers, fetch the token's data, and start polling
    // for the user's balance.

    // Fetching the token data and the user's balance are specific to this
    // sample project, but you can reuse the same initialization pattern.
    this._intializeEthers();
    this._getTokenData();
  }

  async _intializeEthers(): Promise<void> {
    // We first initialize ethers by creating a provider using window.ethereum
    this.setState({
      provider: new ethers.providers.Web3Provider(window.ethereum),
    });

    // When, we initialize the contract using that provider and the token's
    // artifact. You can do this same thing with your contracts.
    this.setState({
      sproutToken: new ethers.Contract(
        SproutContractAddress.SproutToken,
        SproutTokenArtifact.abi,
        this.state.provider?.getSigner(0)
      ),
      ecoToken: new ethers.Contract(
        EcoContractAddress.EcoToken,
        EcoTokenArtifact.abi,
        this.state.provider?.getSigner(0)
      ),
    });
  }

  async _getTokenData(): Promise<void> {
    const sproutName = await this.state.sproutToken?.name();
    const sproutSymbol = await this.state.sproutToken?.symbol();
    const sproutDecimals = await this.state.sproutToken?.decimals();
    const ecoName = await this.state.ecoToken?.name();
    const ecoSymbol = await this.state.ecoToken?.symbol();
    const ecoDecimals = await this.state.ecoToken?.decimals();

    this.setState({
      sproutTokenData: {
        name: sproutName,
        symbol: sproutSymbol,
        decimals: sproutDecimals,
      },
      ecoTokenData: { name: ecoName, symbol: ecoSymbol, decimals: ecoDecimals },
    });
  }

  // This method resets the state
  _resetState(): void {
    this.setState({
      provider: undefined,
      selectedAddress: undefined,
      sproutToken: undefined,
      ecoToken: undefined,
      sproutTokenData: undefined,
      ecoTokenData: undefined,
    });
  }

  // This method just clears part of the state.
  _dismissNetworkError(): void {
    this.setState({ networkError: undefined });
  }

  // This method checks if Metamask selected network is Localhost:8545
  _checkNetwork(): boolean {
    if (window.ethereum.networkVersion === HARDHAT_NETWORK_ID) {
      return true;
    }

    this.setState({
      networkError: "Please connect Metamask to Localhost:8545",
    });

    return false;
  }
}
