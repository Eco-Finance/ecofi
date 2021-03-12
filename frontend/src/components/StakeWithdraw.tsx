import React from "react";
import { ethers } from "ethers";

export interface Props {
  stakeWithdraw(amount: ethers.BigNumberish): void;
  tokenSymbol: string;
}

export const StakeWithdraw: React.FC<Props> = (props) => {
  return (
    <div>
      <h4>Stake Withdraw</h4>
      <form
        onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
          // This function just calls the stakeWithdraw callback with the
          // form's data.
          event.preventDefault();

          const target = event.target as typeof event.target & {
            amount: {value: number};
          }
          const amount = target.amount.value;

          if (amount) {
            props.stakeWithdraw(amount);
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
          <input className="btn btn-primary" type="submit" value="Stake Withdraw" />
        </div>
      </form>
    </div>
  );
}
