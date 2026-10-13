# PCF Account Editor

This project is a Power Apps Component Framework (PCF) control that lets users edit account information inside a Dataverse form using a React-based UI.

The project is split into two main parts:

- [AccountEditor/index.ts](AccountEditor/index.ts): the PCF control lifecycle and data bridge
- [AccountEditor/AccountEditor.tsx](AccountEditor/AccountEditor.tsx): the React form UI

---

## 1. Project purpose

This control is used to edit these values:

- Account Name
- Credit Limit
- Active status

These values are bound to Dataverse fields and are displayed using a simple input form.

---

## 2. High-level working flow

The full flow is:

1. Dataverse provides field values to the PCF control through `context.parameters`.
2. The control reads those values in `init()` and `updateView()`.
3. The control passes the values to React as props.
4. The React component stores them in local state.
5. When the user changes a value, the React component updates its local state.
6. The React component calls the callback functions passed from the parent control.
7. The control stores the new values and calls `notifyOutputChanged()`.
8. The PCF framework calls `getOutputs()`.
9. The new values are saved back to Dataverse.

---

## 3. How index.ts works

File: [AccountEditor/index.ts](AccountEditor/index.ts)

This file is the main entry point for the PCF control.

### Important parts

#### Import statements

```ts
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import AccountEditor from "./AccountEditor";
```

These imports do the following:

- `IInputs` and `IOutputs` define the shape of the values coming from and going back to Dataverse.
- React is used to render the UI.
- `createRoot` creates the React root for the control container.
- `AccountEditor` is the actual React component displayed on the form.

#### The control class

```ts
export class AccountEditorControl
  implements ComponentFramework.StandardControl<IInputs, IOutputs> {
```

This class implements the standard PCF control lifecycle. Every PCF control must provide methods like:

- `init()`
- `updateView()`
- `getOutputs()`
- `destroy()`

#### Internal state

```ts
private accountName = "";
private creditLimit = 0;
private isActive = false;
```

These variables hold the latest values in the control itself. They are synchronized with Dataverse values and used when returning output.

#### Callback handlers

```ts
private handleNameChange = (value: string): void => {
  this.accountName = value;
  this.notifyOutputChanged();
};
```

These functions are passed into the React component as props. When the user edits a field, React calls one of these handlers, which:

- updates the internal state
- tells the PCF framework that output changed

This triggers the save process.

#### `init()`

```ts
public init(
  context: ComponentFramework.Context<IInputs>,
  notifyOutputChanged: () => void,
  state: ComponentFramework.Dictionary,
  container: HTMLDivElement
): void {
  this.container = container;
  this.notifyOutputChanged = notifyOutputChanged;
  this.root = createRoot(this.container);

  this.readValues(context);
}
```

This is called once when the control is created. It:

- keeps a reference to the HTML container
- stores the callback that tells PCF values changed
- creates the React root
- reads the initial Dataverse values from the form context

#### `readValues()`

```ts
private readValues(
  context: ComponentFramework.Context<IInputs>
): void {
  this.accountName = context.parameters.accountName.raw ?? "";
  this.creditLimit = context.parameters.creditLimit.raw ?? 0;
  this.isActive = context.parameters.isActive.raw ?? false;
}
```

This method copies current field values from the PCF context to the control state.

#### `updateView()`

```ts
public updateView(
  context: ComponentFramework.Context<IInputs>
): void {
  this.readValues(context);

  this.root.render(
    React.createElement(AccountEditor, {
      accountName: this.accountName,
      creditLimit: this.creditLimit,
      isActive: this.isActive,
      onNameChange: this.handleNameChange,
      onCreditLimitChange: this.handleCreditLimitChange,
      onActiveChange: this.handleActiveChange
    })
  );
}
```

This method runs whenever the control needs to refresh. It:

- re-reads form values
- passes the data into the React component as props
- attaches callback functions so the UI can send updates back

This is the real connection point between PCF and React.

#### `getOutputs()`

```ts
public getOutputs(): IOutputs {
  return {
    accountName: this.accountName,
    creditLimit: this.creditLimit,
    isActive: this.isActive
  };
}
```

This is where the latest values are returned to the framework. Once `notifyOutputChanged()` fires, the host asks for the updated values and saves them back to the underlying form fields.

#### `destroy()`

```ts
public destroy(): void {
  this.root.unmount();
}
```

This cleans up the React root when the control is removed from the form.

---

## 4. How AccountEditor.tsx works

File: [AccountEditor/AccountEditor.tsx](AccountEditor/AccountEditor.tsx)

This file is the actual user interface. It receives values and callbacks from the parent control and renders HTML inputs.

### Props interface

```ts
export interface AccountEditorProps {
  accountName: string;
  creditLimit: number;
  isActive: boolean;
  onNameChange: (value: string) => void;
  onCreditLimitChange: (value: number) => void;
  onActiveChange: (value: boolean) => void;
}
```

These props are supplied by the PCF control in `index.ts`. They include both:

- data to display (`accountName`, `creditLimit`, `isActive`)
- functions to notify the parent when the user changes something

### Local React state

```ts
const [name, setName] = useState(props.accountName);
const [creditLimit, setCreditLimit] = useState(props.creditLimit);
const [isActive, setIsActive] = useState(props.isActive);
```

React stores the current values inside the component. These values are separate from the parent control state and are used to render the UI.

### Synchronizing with incoming data

```ts
React.useEffect(() => setName(props.accountName), [props.accountName]);
React.useEffect(() => setCreditLimit(props.creditLimit), [props.creditLimit]);
React.useEffect(() => setIsActive(props.isActive), [props.isActive]);
```

Whenever the parent control sends new values, these effects update the local state so the form stays in sync with Dataverse.

### Derived value with useMemo

```ts
const limitMessage = useMemo(() => {
  if (creditLimit >= 100000) return "High credit limit";
  if (creditLimit >= 25000) return "Medium credit limit";
  return "Standard credit limit";
}, [creditLimit]);
```

This is a cached value. React recalculates it only when `creditLimit` changes. This is an optimization.

### Stable event handlers with useCallback

```ts
const handleNameChange = useCallback(
  (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setName(value);
    props.onNameChange(value);
  },
  [props.onNameChange]
);
```

This pattern does two important things:

- updates the UI state immediately
- sends the new value to the parent control using the callback

This prevents extra rerenders and keeps functions stable when dependencies do not change.

### Preview section

```tsx
<AccountSummary
  name={name}
  creditLimit={creditLimit}
  isActive={isActive}
/>
```

This small child component displays a read-only summary of the current values. It is wrapped in `memo`, which means it only rerenders if its props actually change.

---

## 5. Connection between index.ts and AccountEditor.tsx

This is the actual connection between the two files.

### Parent to child

In [AccountEditor/index.ts](AccountEditor/index.ts), the control renders the child component:

```ts
this.root.render(
  React.createElement(AccountEditor, {
    accountName: this.accountName,
    creditLimit: this.creditLimit,
    isActive: this.isActive,
    onNameChange: this.handleNameChange,
    onCreditLimitChange: this.handleCreditLimitChange,
    onActiveChange: this.handleActiveChange
  })
);
```

This means:

- the current values are passed into the React UI
- the event handlers are passed into the React UI too

### Child to parent

In [AccountEditor/AccountEditor.tsx](AccountEditor/AccountEditor.tsx):

```ts
setName(value);
props.onNameChange(value);
```

This tells the parent control that the user changed the field so it can update internal state and save the result.

---

## 6. End-to-end data flow

### When the form loads

1. Dataverse field values are available in `context.parameters`.
2. `readValues(context)` copies them into the control state.
3. `updateView(context)` passes them to `AccountEditor` as props.
4. React uses `useState` to initialize the form values.
5. `useEffect` keeps those values synchronized with any new parent values.

### When the user types

1. The input change event fires.
2. The handler receives the new value.
3. React sets the local state (`setName`, `setCreditLimit`, `setIsActive`).
4. The parent callback is called (`props.onNameChange`, etc.).
5. The control updates its internal variable.
6. `notifyOutputChanged()` is called.
7. PCF asks for outputs through `getOutputs()`.
8. The new values are saved back to Dataverse.

---

## 7. Why this pattern is used

This architecture is common in PCF because it separates concerns:

- PCF control handles the framework lifecycle and Dataverse integration
- React handles the interactive UI experience
- callback props provide a clean way to pass updates back to the host control

This keeps the code modular and makes it easier to maintain when adding more fields or more complex UI logic.

---

## 8. Summary

The project works like this:

- [AccountEditor/index.ts](AccountEditor/index.ts) is the PCF bridge
- [AccountEditor/AccountEditor.tsx](AccountEditor/AccountEditor.tsx) is the UI layer
- Dataverse values enter through `context`
- React displays them
- user actions trigger callbacks
- the control sends updated values back through `getOutputs()`

That is the complete working connection between the two files.
