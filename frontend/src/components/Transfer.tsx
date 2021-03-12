import React from "react";
import { ethers } from "ethers";

export interface Props {
  transferTokens(to: string, amount: ethers.BigNumberish): void;
  tokenSymbol: string;
}

export const Transfer: React.FC<Props> = (props) => {
  return (
    <div>
      <h4>Transfer</h4>
      <form
        onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
          // This function just calls the transferTokens callback with the
          // form's data.
          event.preventDefault();

          const target = event.target as typeof event.target & {
            to: {value: string};
            amount: {value: ethers.BigNumberish};
          }
          const to = target.to.value;
          const amount = target.amount.value;

          if (to && amount) {
            props.transferTokens(to, amount);
          }
        }}
      >
        <div className="form-group">
          <label>Amount of {props.tokenSymbol}</label>
          <input
            className="form-control"
            type="number"
            step="1"
            name="amount"
            placeholder="1"
            required
          />
        </div>
        <div className="form-group">
          <label>Recipient address</label>
          <input className="form-control" type="text" name="to" required />
        </div>
        <div className="form-group">
          <input className="btn btn-primary" type="submit" value="Transfer" />
        </div>
      </form>
    </div>
  );
}
