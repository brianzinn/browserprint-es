/**
 * Information regarding the client application system and properties. 
 */
export type Application = {
  /**
   * Full version string of client application
   */
  version: string
  /**
   * Build version of the client API. This number will increment with every release, making it a reliable way to determine client age.
   */
  build_number: number
  /**
   * API level supported by the client.
   */
  api_level: number
  /**
   * Platform of client. Values: 'windows', 'macos', 'linux', 'android', or '' if the client is too old to support this or the client was unreachable.
   */
  platform: string
  /**
   * An object mapping input formats to the possible outputed conversions. For example, the key "bmp" would reference an array ["zpl", "cpcl", "kpl"], meaning bitmaps can be converted to the ZPL programming language, the CPCL programming language, or the KPL programming language
   */
  supportedConversions: Record<string, string[]>
}

export class ApplicationConfiguration {
  public application: Application;

  constructor() {
    this.application = {
      version: "1.2.0.3",
      build_number: 3,
      api_level: 2,
      platform: "",
      supportedConversions: {}
    }
  }
}