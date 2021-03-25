import React from "react";

export interface Props {
  txHash: string;
}

export const WaitingForTransactionMessage: React.FC<Props> = (props) => {
  return (
    <div className="alert alert-info" role="alert">
      Waiting for transaction <strong>{props.txHash}</strong> to be mined
    </div>
  );
};
