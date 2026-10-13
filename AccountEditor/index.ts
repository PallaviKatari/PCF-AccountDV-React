
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import AccountEditor from "./AccountEditor";

/**
 * This class is the main entry point for the Power Apps Component Framework (PCF) control.
 *
 * The control is responsible for:
 * - receiving data from the Dataverse form through the IInputs interface,
 * - rendering the React-based user interface,
 * - listening for user changes in the UI,
 * - updating internal state and notifying the framework that new values must be saved back to the model.
 *
 * In a PCF control, the lifecycle generally works like this:
 * 1. init() is called once when the control is created.
 * 2. updateView() is called whenever the control needs to redraw based on new context values.
 * 3. User actions trigger callbacks that update local state.
 * 4. notifyOutputChanged() tells the platform that values changed and getOutputs() should return the latest values.
 */
export class AccountEditorControl
  implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  // The HTML element that hosts the control in the form.
  private container!: HTMLDivElement;

  // React 18 root object used to mount and update the UI.
  private root!: Root;

  // Framework callback used to signal that the control's output values have changed.
  private notifyOutputChanged!: () => void;

  // Internal state for the values displayed in the UI and sent back to Dataverse.
  private accountName = "";
  private creditLimit = 0;
  private isActive = false;

  // Stable callbacks: don't recreate them on every updateView call.
  // This is important because PCF expects callback references to remain consistent between renders.
  private handleNameChange = (value: string): void => {
    this.accountName = value;
    this.notifyOutputChanged();
  };

  private handleCreditLimitChange = (value: number): void => {
    this.creditLimit = value;
    this.notifyOutputChanged();
  };

  private handleActiveChange = (value: boolean): void => {
    this.isActive = value;
    this.notifyOutputChanged();
  };

  /**
   * Called once when the control is initialized.
   *
   * This method stores references to the DOM container and the output notification function,
   * creates the React root, and reads the initial values from the context.
   */
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

  /**
   * Reads the current values from the PCF parameter context and stores them in the control state.
   *
   * The context contains data supplied by the host form, such as field values from Dataverse.
   * These are read into this class so that the React component can render with the latest data.
   */
  private readValues(
    context: ComponentFramework.Context<IInputs>
  ): void {
    this.accountName =
      context.parameters.accountName.raw ?? "";

    this.creditLimit =
      context.parameters.creditLimit.raw ?? 0;

    this.isActive =
      context.parameters.isActive.raw ?? false;
  }

  /**
   * Called whenever the control needs to refresh its view.
   *
   * This method re-reads the latest field values from the component context and then re-renders the React UI.
   * The callback props pass event handlers back into the child component so user changes can update the control state.
   */
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

  /**
   * Returns the latest values that should be saved back to the bound Dataverse fields.
   *
   * The framework calls this method when notifyOutputChanged() has been triggered.
   * The returned object matches the IOutputs contract for this control.
   */
  public getOutputs(): IOutputs {
    console.log("getOutputs called", {
      accountName: this.accountName,
      creditLimit: this.creditLimit,
      isActive: this.isActive
    });

    return {
      accountName: this.accountName,
      creditLimit: this.creditLimit,
      isActive: this.isActive
    };
  }

  /**
   * Cleans up the React root when the control is destroyed.
   *
   * This is necessary to avoid leaving mounted React components in memory after the control is removed.
   */
  public destroy(): void {
    this.root.unmount();
  }
}
