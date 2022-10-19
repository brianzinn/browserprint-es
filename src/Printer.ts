import { BrowserPrint, ConvertAndSendOptions, ConvertSendStoreOptions } from "./BrowserPrint";
import { Configuration } from "./Configuration";
import { Device } from "./Device";
import { Info } from "./Info";
import { Status } from "./Status";
import { ResponseCallback, ResponseCallbackType } from "./types";

const dbg = (msg: string) => {
  console.log(msg);
}

/* eslint-disable */
type RequestSuccessCallback = (object?: Status | Info | Configuration) => void

/**
 * Responsible for certain request types to continue reading until the 0x03 (end text code) is received.
 * Waiting for that character ensures the entire message is ready to be parsed
 *
 * @hidden
 */
class Request {
  public type: string;
  public command: string;
  public received: ResponseCallback;
  public success: RequestSuccessCallback;
  public started = false;

  // Printer and Device passed by closure in minified code (we need to pass manually for now).
  private _printer: Printer;
  private _device: Device;
  private _errorCallback: (err: any) => void;

  constructor(printer: Printer, device: Device, type: string, command: string, received: ResponseCallback, success: RequestSuccessCallback, errorCallback: (err: any) => void) {
    this.type = type;
    this.command = command;
    this.received = received;
    this.success = success;
    this._printer = printer;
    this._device = device;
    this._errorCallback = errorCallback;
  }

  public get device(): Device {
    return this._device;
  }

  error = (err: unknown) => {
    // was immediately invoked function returning a function to get "this" via closure
    // this.error = function (a) {
    //   return function (f) {
    //      a(f);
    //       d.executeNextRequest() 
    //   }
    // }(e); // where "e" is is the error callback?
    this._errorCallback(err);
    this._printer.executeNextRequest()
  };

  execute = () => {
    this.started = true;
    console.log(`executing '${this.type}' with command: '${this.command}'`)
    if ("info" == this.type || "config" == this.type || "status" == this.type) {
      this._device.sendThenReadUntilStringReceived(this.command, String.fromCharCode(3), this.received, this.error)
    } else {
      this._device.sendThenReadAllAvailable(this.command, this.received, this.error)
    }
  }
}

export class Printer {

  private _device;
  private configuration: Configuration | undefined;
  private device_request_queue: Request[];

  private _configRetries: number = 0;

  constructor(device: Device) {
    this._device = device;
    this.configuration = undefined;
    this.device_request_queue = [];

    // retrieves the config automatically as part of construction - this fails horribly anyway
    // this.configTimeout()
  }

  public get device(): Device {
    return this._device;
  }

  /**
   * @hidden It's called by request to progress the queue, but otherwise should not be "internal".
   */
  executeNextRequest = (): void => {
    this.device_request_queue.shift();
    this.executeRequest()
  }

  private executeRequest = (): void => {
    // dbg("Requests in queue: " + this.device_request_queue.length);
    if (0 < this.device_request_queue.length) {
      dbg("Executing next request...")
      this.device_request_queue[0].execute()
    }
  }

  private queueRequest = (request: Request): void => {
    dbg("Queueing request " + request.type + ": " + this.device_request_queue.length);
    this.device_request_queue.push(request);
    if (1 === this.device_request_queue.length) {
      request.execute();
    }
  }

  /**
   * NOTE: this is from unminified source
   */
  private onStatusResponse: ResponseCallback = (responseText: string | undefined | null): void => {
    dbg("received status response");
    let newStatus: Status | undefined = undefined;
    try {
      newStatus = new Status(responseText ?? '')
    } catch (error) {
      const currentRequest = this.device_request_queue[0];
      currentRequest.error(error);
      this.executeNextRequest()
    }
    for (; 0 < this.device_request_queue.length;) {
      const request: Request = this.device_request_queue[0]
      if ("status" === request.type) {
        dbg("delivering status...")
        request.success(newStatus)
        this.device_request_queue.shift();
      } else {
        dbg("delivered to all status requests.");
        break
      }
      this.executeRequest()
    }
  }

  private onResponse = (responseText: ResponseCallbackType, classType?: (typeof Status | typeof Info | typeof Configuration)) => {
    dbg("received info response");
    var currentRequest = this.device_request_queue[0];
    let result: Configuration | Info | Status | undefined = undefined;
    if (undefined != classType) {
      // this branch is not part of original library. added for compiling
      if (responseText === undefined || responseText === null) {
        if (currentRequest.error) {
          currentRequest.error('response text null or undefined?');
        }
        this.executeNextRequest();
        return;
      }
      try {
        result = new classType(responseText)
      } catch (err) {
        if (currentRequest.error) {
          currentRequest.error(err);
        }
        this.executeNextRequest();
        return;
      }
    }
    currentRequest.success && currentRequest.success(result);
    this.executeNextRequest()
  };

  private onSGDResponse = (responseText: ResponseCallbackType) => {
    dbg("received sgd response");
    this.onResponse(responseText)
  };

  private onInfoResponse = (responseText: ResponseCallbackType) => {
    dbg("received info response");
    this.onResponse(responseText, Info)
  };

  private onConfigurationResponse: ResponseCallback = (responseText: string | undefined | null): void => {
    dbg("received config response");
    // this brach was added for typing errors
    if (responseText === null || responseText === undefined) {
      console.error('this should not happen')
      this.onResponse('', Configuration);
      return;
    }
    try {
      this.configuration = new Configuration(responseText)
    } catch (f) {
      // was empty catch in original library
      console.error('cannot parse configuration', responseText);
    }
    this.onResponse(responseText, Configuration)
  };

  /**
   * Clears all remaining requests in the queue. This does not cancel the currently running request 
   */
  clearRequestQueue = () => {
    var currentRequest = this.device_request_queue[0];
    this.device_request_queue = [];
    if (currentRequest && currentRequest.started) {
      // put it back on the queue - it's still running
      this.device_request_queue[0] = currentRequest;
    }
  }

  /**
   * Queued
   *
   * Sets an 'SGD' settings value on the printer. This query to the printer is synchronized so that the last query response is received before this query is sent. This means all synchronized queries will be sent and received in the order they are called. 
   * @param setting The setting to set the value of
   * @param value The value the setting should be set to
   * @param success A callback function on success. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns If no callback functions are supplied, returns a Promise that resolve when setting the value has completed. Otherwise returns nothing
   */
  setSGD = (setting: string, value: string, success?: ResponseCallback, failure?: ResponseCallback): Promise<unknown> | void => {
    if (!success && !failure) return new Promise(function (b, c) {
      this.setSGD(setting, value, b, c)
    });
    this.device.send('! U1 setvar "' + setting + '" "' + value + '"\r\n', success, failure)
  };

  /**
   * Queued
   *
   * Get the value of an 'SGD' setting. This query to the printer is synchronized so that the last query response is received before this query is sent. This means all synchronized queries will be sent and received in the order they are called. 
   * @param setting The 'SGD' setting to retrieve
   * @param success A callback function on success, which has the value of the setting passed to it. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns If no callback functions are supplied, returns a Promise that will output the completed printer command. Otherwise returns nothing. 
   */
  getSGD = (setting: string, success?: RequestSuccessCallback, failure?: ResponseCallback): Promise<void> | void => {
    if (!success && !failure) {
      return new Promise((resolve, reject) => {
        this.getSGD(setting, resolve as RequestSuccessCallback /* NOTE: this is not a good cast */, reject)
      });
    }
    // added as it was a convention to call both or none, but broke type safety
    if (!success || !failure) {
      throw new Error('called with missing only one of success or failure handlers');
    }
    const request = new Request(this, this.device, "sgd", '! U1 getvar "' + setting + '"\r\n', this.onSGDResponse, success, failure);
    this.queueRequest(request);
  };

  /**
   * Queued
   *
   * Set, then Get the value of an 'SGD' setting. This query to the printer is synchronized so that the last query response is received before this query is sent. This means all synchronized queries will be sent and received in the order they are called. 
   * @param setting The 'SGD' setting to to set and then retrieve
   * @param value The value to set the 'SGD' setting to
   * @param success A callback function on success, which has the value of the setting passed to it. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns If no callback functions are supplied, returns a Promise that will output the completed printer command. Otherwise returns nothing. 
   */
  setThenGetSGD = (setting: string, value: string, success?: RequestSuccessCallback, failure?: ResponseCallback) => {
    if (!success && !failure) {
      return new Promise(function (f, c) {
        this.setThenGetSGD(setting, value, f, c)
      });
    }
    this.setSGD(setting, value, () => {
      this.getSGD(setting, success, failure)
    }, failure)
  };
  getInfo = (success?: RequestSuccessCallback, failure?: ResponseCallback) => {
    if (!success && !failure) return new Promise(function (a, b) {
      this.getInfo(a, b)
    });

    // added as it was a convention to call both or none, but broke type safety
    if (!success || !failure) {
      throw new Error('called with missing only one of success or failure handlers');
    }

    const request = new Request(this, this.device, "info", "~hi\r\n", this.onInfoResponse, success, failure);
    this.queueRequest(request)
  };

  /**
   * Queued
   *
   * Sends a request to the printer, then builds and returns Zebra.Printer.Configuration object from the response. This query to the printer is synchronized so that the last query response is received before this query is sent. This means all synchronized queries will be sent and received in the order they are called. 
   * 
   * @since Client API Level 2
   * 
   * @param success A callback function on success, which has the Zebra.Printer.Configuration object passed to it. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure, which has the error message passed to it as a string. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns 
   */
  getConfiguration = (success?: (configuration: Configuration) => void, failure?: (err: any) => void): Promise<Configuration> | void => {
    if (!success && !failure) {
      return new Promise<Configuration>((resolve, reject) => {
        this.getConfiguration(resolve, reject);
      });
    }
    // added as it was a convention to call both or none, but broke type safety
    if (!success || !failure) {
      throw new Error('called with missing only one of success or failure handlers');
    }
    const request = new Request(this, this.device, "config", "^XA^HH^XZ", this.onConfigurationResponse, success as RequestSuccessCallback/* TODO: check if this is safe */, failure);
    this.queueRequest(request)
  };

  /**
   * Queued
   *
   * Sends a request to the printer, then builds and returns a Zebra.Printer.Status object from response. This query to the printer is synchronized so that the last query response is received before this query is sent. This means all synchronized queries will be sent and received in the order they are called. 
   * 
   * @param success A callback function on success, which has the Zebra.Printer.Status object passed to it. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure, which has the error message passed to it as a string. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns 
   */
  getStatus = (success?: (status: Status) => void, failure?: (err: any) => void): void | Promise<Status> => {
    if (!success && !failure) {
      return new Promise<Status>((resolve, reject) => {
        this.getStatus(resolve, reject)
      });
    }

    // added as it was a convention to call both or none, but broke type safety
    if (!success || !failure) {
      throw new Error('called with missing failure xor success handler');
    }
    // decompiled had "~hs\r\n"
    const request = new Request(this, this.device, "status", "~HQES", this.onStatusResponse, success as RequestSuccessCallback/* TODO: check if this is safe */, failure);
    this.queueRequest(request)
  };

  getStatusAsync = async (): Promise<Status> => {
    return new Promise<Status>((resolve, reject) => {
      this.getStatus(
        (status) => {
          resolve(status);
        },
        (error) => {
          reject(error)
        }
      );
    });
  }

  /**
   * Queued
   *
   * Sends a command to the printer, then reads back the response. This query to the printer is synchronized so that the last query response is received before this query is sent. This means all synchronized queries will be sent and received in the order they are called. 
   * @param command The query command to send to the printer
   * @param success A callback function on success, which has the Zebra.Printer.Status object passed to it. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure, which has the error message passed to it as a string. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns If no callback functions are supplied, returns a Promise that will return the Zebra.Printer.Status object. Otherwise returns nothing. 
   */
  query = (command: string, success: RequestSuccessCallback, failure: () => void): Promise<void> | void => {
    if (!success && !failure) {
      return new Promise(function (b, c) {
        this.query(command, b, c)
      });
    }
    const request = new Request(this, this.device, "", command, this.onResponse, success, failure);
    this.queueRequest(request)
  };

  /**
   * Checks and reports whether the printer is ready to print.
   * 
   * @since Client API Level 2
   * 
   * @param success A callback function called if the printer is ready to print, passing the status message. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function called if the printer is not ready to print, passing the error message, which has the error message passed to it as a string. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns If no callback functions are supplied, returns a Promise object. Otherwise returns nothing. 
   */
  isPrinterReady = (success?: (message: string) => void, failure?: (message: string) => void): Promise<void> | void => {
    if (!success && !failure) {
      return new Promise(function (a, b) {
        this.isPrinterReady(a, b)
      });
    }

    // added as it was a convention to call both or none, but broke type safety
    if (!success || !failure) {
      throw new Error('called with missing failure handler or success handler');
    }

    (this.getStatus() as Promise<Status>).then((c: Status) => {
      if (c.isPrinterReady()) {
        success(c.getMessage())
      } else {
        failure(c.getMessage())
      }
    })
  };

  /**
   * Prints an image resource as a label, automatically resizing the image to best fill the print width and label length. Image will be scaled to the largest possible size while still entirely fitting within the printable area of the label, according to the Zebra.Printer.Configuration retrieved from the printer. This function requires that the API has successfully retrieved the printer configuration before calling. 
   * 
   * @since Client API Level 4
   * 
   * @param resource The resource to be printed. Accepts a URL as a string, or a blob of an already loaded image file.
   * @param options Options for converting the resource. 
   * @param success A callback function on success. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure, which has the error message passed to it as a string. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns If no callback functions are supplied, returns a Promise object. Otherwise returns nothing. 
   */
  printImageAsLabel = (resource: string | Blob, options: ConvertAndSendOptions, success?: ResponseCallback, failure?: () => void): Promise<unknown> | void => {
    if (!success && !failure) {
      return new Promise((resolve, reject) => {
        this.printImageAsLabel(resource, options, resolve, reject);
      });
    }
    // added as it was a convention to call both or none, but broke type safety
    if (!success || !failure) {
      throw new Error('called with missing only one of success or failure handlers');
    }
    this.getConfigurationRetrieveIfNeeded().then(function (b) {
      options.fitTo = {
        width: b.printWidth,
        height: b.labelLength
      };
      options.action = "print";
      BrowserPrint.convert(resource, this.device, options, success, failure)
    }).catch(failure)
  };

  /**
   * Retrieves the resource and converts it into a printable form. Converted resource will be returned as string with a format dependent on printer command language requested and capabilities of the host platform. 
   * 
   * @since Client API Level 4 
   * 
   * @param resource The resource to be printed. Accepts a URL as a string, or a blob of an already loaded image file.
   * @param options Options for converting the resource provided. 
   * @param success A callback function on success with the converted resource passed to it. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure, which has the error message passed to it as a string. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns If no callback functions are supplied, returns a Promise object that returns the converted resource. Otherwise returns nothing. 
   */
  getConvertedResource = (resource: string | Blob, options: ConvertAndSendOptions, success?: ResponseCallback, failure?: ResponseCallback) => {
    if (!success && !failure) return new Promise(function (b, f) {
      this.getConvertedResource(resource, options, b, f)
    });
    // added as it was a convention to call both or none, but broke type safety
    if (!success || !failure) {
      throw new Error('called with missing only one of success or failure handlers');
    }
    this.getConfigurationRetrieveIfNeeded().then(function (b) {
      options.action = "return";
      BrowserPrint.convert(resource, this.device, options, success, failure)
    }).catch(failure)
  };
  /**
   * Retrieves the resource and converts it into a storeable form, storing it on the printer. The path the resource was stored at on the printer will be passed to the success function as a string.
   * @param resource The resource to be stored. Accepts a URL as a string, or a blob of an already loaded image file.
   * @param options (optional in original jsdoc) Options for converting the provided resource.
   * @param success (optional in original jsdoc) A callback function on success with the storage location path passed to it. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @param failure A callback function on failure, which has the error message passed to it as a string. Omitting the success and failure callbacks will automatically setup a Promise instead
   * @returns If no callback functions are supplied, returns a Promise object that returns the storage location path. Otherwise returns nothing. 
   */
  storeConvertedResource = (resource: string | Blob, options: ConvertSendStoreOptions, success: ResponseCallback, failure: () => void): Promise<void> | void => {
    if (!success && !failure) {
      return new Promise((resolve, reject) => {
        this.storeConvertedResource(resource, options, resolve as ResponseCallback /* NOTE: this is not a good cast */, reject)
      });
    }
    this.getConfigurationRetrieveIfNeeded().then(function (b) {
      options.action = "store";
      BrowserPrint.convert(resource, this.device, options, success, failure)
    }).catch(failure)
  };

  private getConfigurationRetrieveIfNeeded = (): Promise<Configuration> => {
    return new Promise((resolve, reject) => {
      if (this.configuration) {
        resolve(this.configuration);
      }
      else {
        return (this.getConfiguration() as Promise<Configuration>)
          .then((configuration: Configuration) => {
            this.configuration = configuration;
            return this.configuration;
          }).catch((err) => {
            // reject?
            reject(err);
          })
      }
    })
  };

  /**
   * @hidden
   */
  configTimeout = (retries?: number) => {
    if (retries === undefined) {
      this._configRetries = 0;
    }
    this.configuration || (this.getConfiguration() as Promise<Configuration>).then((configuration: Configuration) => {
      return this.configuration = configuration
    }).catch((err) => {
      this._configRetries++;
      console.error(err);
      if (this._configRetries < 5) {
        setTimeout(
          () => this.configTimeout(this._configRetries),
          1000
        )
      }
    })
  }
};
