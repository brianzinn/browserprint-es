import { Device } from "./Device";
import { ResponseCallback } from "./types";
import { attachOnDoneCallbacks, getApiLocation, getRequest } from "./utils";

// TODO: remove this
/* eslint-disable */

const deviceTimeoutMap : Record<string /* it's actually typeof Device TS1268 rule */, NodeJS.Timeout> = {};

export type Size = {
  /**
   * int
   */
  width?: number
  /**
   * int
   */
  height?: number
}

export enum ToFormat {
  zpl = 'zpl',
  cpcl = 'cpcl',
  kpl = 'kpl',
  none= 'none'
}

export type ConvertAndSendOptions = {
  /**
   * The format the file should be converted to. Options are zpl, cpcl, kpl, and none. If 'none' is provided, the resource will not be converted to a different format before sending to or storing on the device. Default value is zpl.
   */
  toFormat?: ToFormat
  /**
   * The format of the resource provided. If not specified, the application will attempt to determine the format based on the file type or file structure.
   */
  fromFormat?: string
  /**
   * The action to take with the converted data. 'print' will attempt to make the converted resource printable and send it to the printer. 'store' will attempt to make the resource storable and store it at the path provide. 'return' will convert the resource and return it to the browser.
   */
  action?: 'print' | 'store' | 'return'
  /**
   * The height + width an image resource should be resized to
   */
  resize?: Size

  /**
   * Scale an image resource so that it fits into a rectangle described by fitTo.width and fitTo.height, maintaining aspect ratio.
   */
  fitTo?: Size

  /**
   * (float) Scale an image resource by the this factor.
   */
  scale?: number

  /**
   * The licensing key for the resource conversion. Currently, only converting from a PDF format requires a licensing key
   */
  featureKey?: string
}

export type ConvertSendStoreOptions = ConvertAndSendOptions & {
  /**
   * The name of the stored file
   */
  storageName?: string
}

export class BrowserPrint {

  /**
   * Function that is called if the successCallback is not included for a BrowserPrint operation.
   *
   * @param response success response on callback
   */
  static defaultSuccessCallback: ResponseCallback = () => {/* empty */}
  /**
   * Function that is called if the errorCallback is not included for a BrowserPrint operation.
   *
   * @param response error response on callback
   */
  static defaultErrorCallback: ResponseCallback = () => {/* empty */}

  static loadFileFromUrl = (url: URL | string, onSuccessCallback: ResponseCallback, onErrorCallback?: ResponseCallback) => {
    const request = getRequest("get", url);
    console.log("ResponseType: " + request.responseType);
    request.responseType = "blob";
    setupOnDoneCallbacks(request, onSuccessCallback, onErrorCallback);
    request.send()
  }

  static convert = (data: string | Blob | undefined, device: Device, options: ConvertAndSendOptions, onSuccessCallback: ResponseCallback, onErrorCallback?: ResponseCallback) => {
    if (data) {
      if ("string" === typeof data) {
        const successCallback = (responseText: string | undefined | null) => {
          if (!options.fromFormat) {
            options.fromFormat = data.substring(data.length - 3);
          }

          const textToConvert = (responseText === null) ? undefined : responseText; // to narrow type for 'convert'
          this.convert(textToConvert, device, options, onSuccessCallback, onErrorCallback)
        };
        this.loadFileFromUrl(data, successCallback, onErrorCallback);
      } else {
        const requestObject = getRequest("POST", getApiLocation() + "convert");
        if (data.type && (data.type.startsWith("image/") || data.type.startsWith("application/"))) {
          options.fromFormat = data.type.toLowerCase().replace("image/", "").replace("application/", "").replace("x-ms-", "")
        }
        if (requestObject) {
          requestObject.responseType = "text";
          setupOnDoneCallbacks(requestObject, (successResponseText) => { onSuccessCallback(JSON.parse(successResponseText ?? '' /* coersion for typescript */) as string) }, onErrorCallback);
          const formData = new FormData;
          const jsonPayload: Record<string, any> = {};
          if (null != options && undefined !== options) {
            jsonPayload.options = options
          }
          if (device) {
            jsonPayload.device = device
          }
          formData.append("json", JSON.stringify(jsonPayload));
          formData.append("blob", data);
          requestObject.send(formData)
        }
      }
    } else {
      if (onErrorCallback) {
        onErrorCallback("Resource not specified")
      } else {
        BrowserPrint.defaultErrorCallback("Resource not specified")
      }
    }
  }

  /**
   * Get devices available to the local client
   *
   * @since Client API Level 2 
   * 
   * @param finishedCallback The function that is called when finding devices is completed, passing an array of devices to the function. 
   * @param errorCallback The function that is called if an error occurs while finding devices, passing the error message to the function if there is one.
   * @param typeFilter The type of device you are looking for. Not specifying a type will return all devices.
   */
  static getLocalDevices = (finishedCallback: ResponseCallback /* DiscoveredDevicesCallback */, errorCallback?: ResponseCallback, typeFilter?: string): void => {
    const requestObject = getRequest("GET", getApiLocation() + "available");
    const finishedFunction = (finishedResponseText: string | undefined | null) => {
      let response: any = finishedResponseText;
      console.log('finished function wrapper', finishedResponseText);
      response = JSON.parse(response);
      for (const c in response)
        if (response.hasOwnProperty(c) && Array.isArray(response[c])) {
          for (let arr = response[c], finishedResponseText = 0; finishedResponseText < arr.length; ++finishedResponseText) {
            arr[finishedResponseText] = new Device(arr[finishedResponseText]);
          }
        }
      if (undefined === typeFilter) {
        finishedCallback(response)
      } else {
        if (!response.hasOwnProperty(typeFilter)) {
          response[typeFilter] = [];
        }
        finishedCallback(response[typeFilter])
      }
    }
    setupOnDoneCallbacks(requestObject, finishedFunction, errorCallback);
    requestObject.send();
  }

  static getDefaultDevice = (deviceType: string, successCallback: (device: Device | null) => void, errorCallback?: ResponseCallback): void => {
    let apiPath = "default";
    if (undefined !== deviceType && null != deviceType) {
      apiPath = apiPath + "?type=" + deviceType
    };
    let requestObject = getRequest("GET", getApiLocation() + apiPath)
    let finishedFunction = function (successResponseText: string | undefined | null) {
      let response = successResponseText;
      if ("" === response || response === undefined || response === null) {
        successCallback(null)
      } else {
        let device = new Device(JSON.parse(response))
        successCallback(device);
      }
    }
    requestObject = setupOnDoneCallbacks(requestObject, finishedFunction, errorCallback)
    requestObject.send()
  }

  static getApplicationConfiguration = (successCallback: ResponseCallback /* ApplicationConfigurationCallback */, errorCallback?: ResponseCallback): void => {
    const requestObject = getRequest("GET", getApiLocation() + "config");
    const finishedFunction = (successResponseText: string | undefined | null) => {
      let response = successResponseText;
      if ("" === response || response === undefined || response === null) {
        successCallback(null)
      } else {
        response = JSON.parse(response);
        successCallback(response);
      }
    }
    setupOnDoneCallbacks(requestObject, finishedFunction, errorCallback);
    requestObject.send();
  }

  static readOnInterval = (device: Device, callback: ResponseCallback, readInterval?: number): void => {
    if (undefined === readInterval || 0 === readInterval) {
      readInterval = 1
    };
    let readFunc = function () {
      device.read(function (c) {
        callback(c);
        deviceTimeoutMap[device as any as string] = setTimeout(readFunc, readInterval)
      }, function (b) {
        deviceTimeoutMap[device as any as string] = setTimeout(readFunc, readInterval)
      })
    };
    deviceTimeoutMap[device as any as string] = setTimeout(readFunc, readInterval)
  }

  /**
   * Stops continually reading from a device that was registered with readOnInterval or bindFieldToReadData 
   * @param device
   */
  static stopReadOnInterval = (device: Device): void => {
    if (deviceTimeoutMap[device as any as string]) {
      clearTimeout(deviceTimeoutMap[device as any as string])
    }
  }

  static bindFieldToReadData = (device: Device, field: any, readInterval?: number, onReadCallback?: ResponseCallback): void => {
    const onIntervalCallback = (responseText: string | undefined | null) => {
      if ("" !== responseText) {
        field.value = responseText
        if (undefined !== onReadCallback && null != onReadCallback) {
          onReadCallback();
        }
      }
    }
    this.readOnInterval(device, onIntervalCallback, readInterval)
  }
}

const setupOnDoneCallbacks = (requestObject: XMLHttpRequest, successCallback?: ResponseCallback, onErrorCallback?: ResponseCallback): XMLHttpRequest => {
  if (undefined === successCallback) {
    successCallback = BrowserPrint.defaultSuccessCallback;
  };
  if (undefined === onErrorCallback) {
    onErrorCallback = BrowserPrint.defaultErrorCallback
  }
  return attachOnDoneCallbacks(requestObject, successCallback, onErrorCallback)
}