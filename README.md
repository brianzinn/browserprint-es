## install
```bash
npm i browserprint-es
```
```bash
yarn add browserprint-es
```

This is a direct port of `BrowserPrint` in an easier to consume and use format with modern development - adhering closely to the original API while allowing async/await and full IDE intellisense and typings + comments support.

The minified version provided by Zebra doesn't provide typings/intellisense. Although there is a separate JSDoc it's not that intuitive and cannot be brought into development flow/IDE like a commented ES version. The minified script won't bundle and integrate with your build (ie: tree shaking).

> Generated from TypeScript source for automatic typings!

## BrowserPrint examples (following original API)
This project is backwards compatible with original callback signatures, but has been extended with async/await:
```typescript
import BrowserPrint, { Device, Configuration} from 'browserprint-es'
let defaultDevice: Device | null = null;
let localDevices: Record<string, Device[]> = {};
let applicationConfiguration: Configuration | null = null;
BrowserPrint.getDefaultDevice(
  'printer',
  (response: Device | null) => {
    console.log('got default device', response);
    defaultDevice = response;
  },
  (err) => console.error(err)
)
BrowserPrint.getLocalDevices(
  (response) => {localDevices = response},
  (err) => console.error('error local devices:', err)
)
BrowserPrint.getApplicationConfiguration(
  (response) => {configuration = response},
  (err) => console.error('error application config:', err)
)
```

Above can be written instead with async/await.  Examples:

*TypeScript*
```typescript
// async/await (Promises) available on some methods (so far)
// NOTE: declaration types not necessary - added to describe return types
import BrowserPrint, { Device, Configuration } from 'browserprint-es'
const device: Device | null = await BrowserPrint.getDefaultDeviceAsync('printer');
const localDevices: Record<string, Device[]> = await BrowserPrint.getLocalDevicesAsync();
const applicationConfiguration: Configuration | null = await BrowserPrint.getConfiguration();
```
*JavaScript*
```typescript
import BrowserPrint from 'browserprint-es'
const device = await BrowserPrint.getDefaultDeviceAsync('printer');
const localDevices = await BrowserPrint.getLocalDevicesAsync();
const applicationConfiguration = await BrowserPrint.getConfiguration();
```

## Original BrowserPrint API (ie: from BrowserPrint-3.0.xxx.min.js)
```typescript
// These are static methods (call directly)
BrowserPrint.bindFieldToReadData(device, field, readInterval, onReadCallback)
BrowserPrint.convert(resource, device, options, finishedCallback, errorCallback)
BrowserPrint.convert(resource, device, options, finishedCallback, errorCallback)
BrowserPrint.getApplicationConfiguration(finishedCallback, errorCallback)
BrowserPrint.getDefaultDevice(type, finishedCallback, errorCallback)
BrowserPrint.getLocalDevices(finishedCallback, errorCallback, typeFilter)
BrowserPrint.loadFileFromUrl(url, finishedCallback, errorCallback)
BrowserPrint.readOnInterval(device, callback, readInterval)
BrowserPrint.stopReadOnInterval(device)

// properties:
const deviceType: string = device.deviceType
const name: string = device.name
const readRetries: number = device.readRetries
// methods:
device.convertAndSendFile(resource, finishedCallback, errorCallback, options)
device.read(finishedCallback, errorCallback)
device.readAllAvailable(finishedCallback, errorCallback, retries)
device.readUntilStringReceived(receivedString, finishedCallback, errorCallback, retries)
device.send(dataToSend, finishedCallback, errorCallback)
device.sendFile(resource, finishedCallback, errorCallback)
device.sendThenRead(dataToSend, finishedCallback, errorCallback)
device.sendThenReadAllAvailable(dataToSend, finishedCallback, errorCallback, retries)
device.sendThenReadUntilStringReceived(dataToSend, receivedString, finishedCallback, errorCallback, retries)
// deprecated - will be removed in a future version
device.sendUrl(urlOfResource, finishedCallback, errorCallback, options)
```

# Original BrowserPrint-Zebra API (ie: from BrowserPrint-Zebra-1.0.xxx.min.js)
The "BrowserPrint-Zebra" API adds objects like Configuration, Status, Info and most importantly the Printer class to abstract and simplify communication with Device
> especially to decoding of responses to strongly typed objects
```javascript
// not static methods like BrowserPrint
// Printer instance methods used to communicate with devices.
const printer = new Printer(device);
printer.getConfiguration(success, failure) 
printer.getConvertedResource(resource, options, success, failure)
printer.getInfo(success, failure)
printer.getSGD(setting, success, failure)
printer.getStatus(success, failure)
printer.isPrinterReady(success, failure)
printer.printImageAsLabel(resource, options, success, failure)
printer.query(command, success, failure)
printer.setSGD(setting, value, success, failure)
printer.setThenGetSGD(setting, value, success, failure)
printer.storeConvertedResource(resource, options, success, failure)
```

## BrowserPrint-Zebra API example
Adding this brought in the useful `Printer` object that makes it easier to get `Status`/`isPrinterReady`/`Info`/`Configuration`/etc.
ie:
```typescript
import BrowserPrint, { Device, Printer, Status } from 'browserprint-es'
const device: Device | null = await BrowserPrint.getDefaultDeviceAsync();
const printer: Printer = new Printer(device! /* assume above call is a valid printer */);
// same as device.send("~hs"), but you need to parse the response yourself
// ie: this is a response:
// <0x02>030,0,0,1245,000,0,0,0,000,0,0,0<0x03>
// <0x02>000,0,0,0,0,2,4,0,00000000,1,000<0x03>
// <0x02>1234,0<0x03>
// <0x02>030,0,0,1245,000,0,0,0,000,0,0,0<0x03>
// <0x02>000,0,0,0,0,2,4,0,00000000,1,000<0x03>
// <0x02>1234,

// This calls device.send("~/hs") and parses responses like above for you and even ensures entire response is ready before returning in some cases:
const status: Status | null = await printer.getStatusAsync()
```

TODO:
1. There's also some undocumented features that I will share at some point for watching/monitoring devices (hint: You can find them in the imports and typings).
2. Add more unit tests (very basic testing of parsing only in place so far)