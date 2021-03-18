import React from "react";

export function StakeDeposit({ stakeDeposit, tokenSymbol }) {
  return (
    <div>
      <h4>Stake Deposit</h4>
      <form
        onSubmit={(event) => {
          // This function just calls the stakeDeposit callback with the
          // form's data.
          event.preventDefault();

          const formData = new FormData(event.target);
          const amount = formData.get("amount");

          console.log('amount', amount)
          if (amount) {
            stakeDeposit(amount);
          }
        }}
      >
        <div className="form-group">
          <label>Amount of {tokenSymbol}</label>
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
          <input className="btn btn-primary" type="submit" value="Stake Deposit" />
        </div>
      </form>
    </div>
  );
}
