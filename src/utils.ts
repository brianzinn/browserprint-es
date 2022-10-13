import { ResponseCallback } from "types";

export const getRequest = (method: string, url: string | URL): XMLHttpRequest => {
  const requestObject = new XMLHttpRequest;
  requestObject.open(method, url, !0);
  // "undefined" != typeof XDomainRequest
  //   ? (requestObject = new XDomainRequest, requestObject.open(method, url))
  //   : requestObject = null;
  return requestObject
}

export const attachOnDoneCallbacks = (requestObject: XMLHttpRequest, successCallback: ResponseCallback, errorCallback: ResponseCallback) => {
  requestObject.onreadystatechange = function () {
    if (requestObject.readyState === XMLHttpRequest.DONE && 200 === requestObject.status) {
      if ("" === requestObject.responseType) {
        successCallback(requestObject.responseText);
      } else {
        successCallback(requestObject.response as string /* unsafe arg */);
      }
    } else if (requestObject.readyState === XMLHttpRequest.DONE) {
      if (errorCallback) {
        errorCallback(requestObject.response as string /* unsafe arg */);
      } else {
        console.log("error occurred with no errorCallback set.")
      }
    }
  };
  return requestObject
}

const useHttpsByUserAgent = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// navigator.userAgent.indexOf("Trident/7.0"); wow!
let API_LOCATION = "http://127.0.0.1:9100/";
if (useHttpsByUserAgent && "https:" === location.protocol) {
  API_LOCATION = "https://127.0.0.1:9101/"
};

export const getApiLocation = (): string => API_LOCATION;