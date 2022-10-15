Easy to install:
```bash
yarn add browserprint-es
```

```typescript
import BrowserPrint, { Device } from 'browserprint-es';

let defaultDevice: Device | null = null;
BrowserPrint.getDefaultDevice(
      'printer',
      (response: Device | null) => {
        console.log('got default device', response);
        defaultDevice = response;
      },
      (err: any) => {console.error('error', err)},
    )
```

This is a direct port of BrowserPrint in an easier to consume and read format.
The minified version provided by Zebra doesn't provide typings/intellisense - there is a JSDoc, but it's not that intuitive and cannot be brought in as above - you'd need to use the minified script and it won't bundle and integrate with your build (ie: tree shaking).  There's also some undocumented features that I will share - you can find them in the imports and typings though.

> Completely generated from TypeScript, so the typings match the library!

> Started on Unit Tests

Additionally, I want to be able to asyc/await.  I'll drop that in the next version.  This is a test!

** More Examples to follow with Printer (here are some BrowserPrint ones)
```typescript
BrowserPrint.getLocalDevices(
  (res) => console.log('success local devices:', res),
  (err) => console.error('error local devices:', err)
)
BrowserPrint.getApplicationConfiguration(
  (res) => console.log('success application config:', res),
  (err) => console.error('error application config:', err)
)
```