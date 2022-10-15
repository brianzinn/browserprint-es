import { hasProperControlCharacters } from "./utils";

export class Configuration {

  private raw: string;
  private _settings: Record<string, string>;

  private _darkness: number;
  private _printSpeed: number;
  private _printWidth: number;
  private _labelLength: number;
  private _firmwareVersion: string;
  private _linkOSVersion: string;

  constructor(raw: string) {
    if (!raw) throw "Invalid Response";
    this.raw = raw = raw.trim();
    this._settings = {};
    if (!hasProperControlCharacters(raw)) {
      throw "Invalid Response";
    }

    raw = raw.replace(String.fromCharCode(2), "");
    raw = raw.replace(String.fromCharCode(3), "");
    const parts: string[] = raw.split("\n");
    for (let f = 0; f < parts.length; ++f) {
      let b = parts[f].trim();
      const d = b.substring(20);
      b = b.substring(0, 20).trim();
      this._settings[d] = b
    }
    this._darkness = parseFloat(this._settings.DARKNESS);
    this._printSpeed = parseInt(this._settings["PRINT SPEED"].replace("IPS", "").trim());
    this._printWidth = parseInt(this._settings["PRINT WIDTH"]);
    this._labelLength = parseInt(this._settings["LABEL LENGTH"]);
    this._firmwareVersion = this._settings.FIRMWARE.replace("<-", "").trim();
    this._linkOSVersion = this._settings.hasOwnProperty("LINK-OS VERSION") ? this._settings["LINK-OS VERSION"] : "0"
  }

  /**
   * The darkness value as a float
   */
  get darkness(): number {
    return this._darkness;
  }

  /**
   * The print speed in dots per inch (int)
   */
  get printSpeed(): number {
    return this._printSpeed;
  }

  /**
   * The width in dots (int)
   */
  get printWidth(): number {
    return this._printWidth;
  }

  /**
   * The current label length (int)
   */
  get labelLength(): number {
    return this._labelLength;
  }

  /**
   * The version of firmware running on the printer
   */
  get firmwareVersion(): string {
    return this._firmwareVersion;
  }

  /**
   * The version of Link-OS the printer is running, or "0" if the printer is not a Link-OS Printer
   */
  get linkOSVersion(): string {
    return this._linkOSVersion;
  }


}