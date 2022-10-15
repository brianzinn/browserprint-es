import { hasProperControlCharacters } from "./utils";

export class Status {
  private raw: string;

  private _offline;
  private _paperOut: boolean;
  private _paused: boolean;
  private _headOpen: boolean;
  private _ribbonOut: boolean;

  constructor(raw?: string) {
    if (!raw) {
      raw = ""
    };
    raw = raw.trim();

    this.raw = raw;
    this._offline = false

    if (hasProperControlCharacters(raw)) {
      this._offline = false;
      this._paperOut = this.isFlagSet(5);
      this._paused = this.isFlagSet(7);
      this._headOpen = this.isFlagSet(43);
      this._ribbonOut = this.isFlagSet(45);
    } else {
      this._offline = true;
      this._ribbonOut = false;
      this._headOpen = false;
      this._paused = false;
      this._paperOut = false;
    }
  }

  /**
   * Not in JsDoc, but referenced elsewhere
   */
  get offline(): boolean {
    return this._offline;
  }

  /**
   * True if the printer is in a paper out state, false otherwise
   */
  get paperOut(): boolean {
    return this._paperOut;
  }

  /**
   * True if the printer is in a paused state, false otherwise
   */
  get paused(): boolean {
    return this._paused;
  }

  /**
   * True if the printer is in a head open state, false otherwise
   */
  get headOpen(): boolean {
    return this._headOpen;
  }

  /**
   * True if the printer is in a ribbon out state, false otherwise
   */
  get ribbonOut(): boolean {
    return this._ribbonOut;
  }

  isFlagSet = (index: number): boolean => {
    return "1" === this.raw.charAt(index)
  };

  /**
   * Returns whether the printer is ready to print or not. 
   * @returns True if the printer is ready to print, false otherwise 
   */
  isPrinterReady = (): boolean => {
    return !(this._paperOut || this._paused || this._headOpen || this._ribbonOut || this._offline)
  };

  /**
   * Returns a string describing the state of the printer in english. 
   * 
   * @returns The description of the status in english 
   */
  getMessage = (): string => {
    return this.isPrinterReady() ? "Ready" : this._offline ? "Offline" : this._paperOut ? "Paper Out" : this._headOpen ? "Head Open" : this._ribbonOut ? "Ribbon Out" : this._paused ? "Paused" : "Ready"
  }
}