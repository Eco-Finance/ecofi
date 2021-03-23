import React from "react";

import { NetworkErrorMessage } from "./NetworkErrorMessage";

export interface Props {
  connectWallet(): void;
  networkError?: string;
  dismiss(): void;
}

export const ConnectWallet: React.FC<Props> = (props) => {
  return (
    <div className="container">
      <div className="row justify-content-md-center">
        <div className="col-12 text-center">
          {/* Metamask network should be set to Localhost:8545. */}
          {props.networkError && (
            <NetworkErrorMessage
              message={props.networkError}
              dismiss={props.dismiss}
            />
          )}
        </div>
        <div className="col-6 p-4 text-center">
          <p>Please connect to your wallet.</p>
          <button
            className="btn btn-warning"
            type="button"
            onClick={props.connectWallet}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
