import { hasProperControlCharacters } from "./utils";

/**
 * Represents information about the Zebra Printer
 * 
 * @since Client API Level 2 
 */
export class Info {

  private raw: string;
  private _model: string;
  private _firmware: string;

  /**
   * 
   * @param raw The information response from the printer to be parsed 
   */
  constructor(raw: string) {
    if (!raw) {
      throw "Invalid Response";
    }
    this.raw = raw;
    raw = raw.trim();
    if (!hasProperControlCharacters(raw)) {
      throw "Invalid Response";
    }
    const parts = raw.split(","); // TODO: verify length?
    this._model = parts[0].substring(1);
    this._firmware = parts[1]
  }

  /**
   * The printer firmware version
   */
  get firmware(): string {
    return this._firmware;
  }

  /**
   * The printer model
   */
  get model(): string {
    return this._model;
  }
}