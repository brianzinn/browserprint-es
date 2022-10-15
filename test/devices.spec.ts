import 'jsdom-global/register'
import { Device, DeviceFields } from '../src/Device'
import assert from 'assert';

describe(' > Device tests', () => {
  it('creates Device (and sets name) - Basic test', async () => {
    const realExample: DeviceFields = {
      "deviceType": "printer",
      "uid": "Zebra ZP 500 (ZPL)",
      "provider": "com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider",
      "name": "Zebra ZP 500 (ZPL)",
      "connection": "driver",
      "version": 3,
      "manufacturer": "Zebra Technologies"
    }
    const device = new Device(realExample);
    assert.strictEqual(device.name, 'Zebra ZP 500 (ZPL)');
  });

  const getLocalDevicesAPIResponse = {
    "printer": [
      {
        "deviceType": "printer",
        "uid": "27j184501282",
        "provider": "com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider",
        "name": "27j184501282",
        "connection": "usb",
        "version": 3,
        "manufacturer": "Zebra Technologies"
      }, {
        "deviceType": "printer",
        "uid": "Zebra ZP 500 (ZPL)",
        "provider": "com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider",
        "name": "Zebra ZP 500 (ZPL)",
        "connection": "driver",
        "version": 3,
        "manufacturer": "Zebra Technologies"
      }]
  };

  const getApplicationConfigurationAPIResponse = {
    "application":{
      "api_level":3,
      "build_number":279,
      "version":"1.2.1.279",
      "platform":"windows"
    }
  }

})