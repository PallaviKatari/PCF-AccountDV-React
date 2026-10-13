
import * as React from "react";
import { memo, useCallback, useMemo, useState } from "react";

export interface AccountEditorProps {
  accountName: string;
  creditLimit: number;
  isActive: boolean;
  onNameChange: (value: string) => void;
  onCreditLimitChange: (value: number) => void;
  onActiveChange: (value: boolean) => void;
}

// Child component: React.memo skips rendering when props are unchanged.
const AccountSummary = memo(
  ({ name, creditLimit, isActive }: {
    name: string;
    creditLimit: number;
    isActive: boolean;
  }) => {
    console.log("AccountSummary rendered");

    return (
      <div style={{ marginTop: 12, padding: 10, background: "#f3f3f3" }}>
        <strong>Preview</strong>
        <p>Account: {name || "(empty)"}</p>
        <p>Credit limit: {creditLimit.toFixed(2)}</p>
        <p>Status: {isActive ? "Active" : "Inactive"}</p>
      </div>
    );
  }
);

export default function AccountEditor(props: AccountEditorProps) {
  const [name, setName] = useState(props.accountName);
  const [creditLimit, setCreditLimit] = useState(props.creditLimit);
  const [isActive, setIsActive] = useState(props.isActive);

  // Update local state when the host supplies new Dataverse values.
  React.useEffect(() => setName(props.accountName), [props.accountName]);
  React.useEffect(
    () => setCreditLimit(props.creditLimit),
    [props.creditLimit]
  );
  React.useEffect(() => setIsActive(props.isActive), [props.isActive]);

  // Optimization 1: cache a derived value until its dependency changes.
  const limitMessage = useMemo(() => {
    console.log("Calculating credit limit message");

    if (creditLimit >= 100000) return "High credit limit";
    if (creditLimit >= 25000) return "Medium credit limit";
    return "Standard credit limit";
  }, [creditLimit]);

  // Optimization 2: keep handler references stable between renders.
  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setName(value);
      props.onNameChange(value);
    },
    [props.onNameChange]
  );

  const handleLimitChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setCreditLimit(value);
      props.onCreditLimitChange(value);
    },
    [props.onCreditLimitChange]
  );

  const handleActiveChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.checked;
      setIsActive(value);
      props.onActiveChange(value);
    },
    [props.onActiveChange]
  );

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <h3>Dataverse Account Editor</h3>

      <label>Account Name</label>
      <input
        value={name}
        onChange={handleNameChange}
        style={{ display: "block", marginBottom: 12, width: "95%" }}
      />

      <label>Credit Limit</label>
      <input
        type="number"
        min="0"
        value={creditLimit}
        onChange={handleLimitChange}
        style={{ display: "block", marginBottom: 12 }}
      />

      <label>
        <input
          type="checkbox"
          checked={isActive}
          onChange={handleActiveChange}
        />
        {" "}Active
      </label>

      <p>{limitMessage}</p>

      <AccountSummary
        name={name}
        creditLimit={creditLimit}
        isActive={isActive}
      />
    </div>
  );
}
