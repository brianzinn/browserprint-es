import nock, { Scope } from 'nock';
// const nock: any = {}; // disable nock if you have a printer connected locally
import 'jsdom-global/register'
import { Device, DeviceFields } from '../src/Device'
import { Printer } from '../src/Printer';
import { createSandbox, SinonSandbox } from 'sinon';
import assert from 'assert';


describe(' > Printer tests', () => {

  // this._paperOut = this.isFlagSet(5);
  // this._paused = this.isFlagSet(7);
  // this._headOpen = this.isFlagSet(43);
  // this._ribbonOut = this.isFlagSet(45);

  type StatusConfig = {
    paperOut?: boolean,
    paused?: boolean,
    headOpen?: boolean,
    ribbonOut?: boolean
  }

  const getStatusResponse = (statusConfig?: StatusConfig) => {
    const config = statusConfig ?? {};
    return `1234${config.paperOut === true ? '1' : '0'}6${config.paused === true ? '1' : '0'}89012345678901234567890123456789012${config.headOpen === true ? '1' : '0'}4${config.ribbonOut === true ? '1' : '0'}67890`
  };

  let sandbox: SinonSandbox;

  beforeEach(async function beforeEach() {
    sandbox = createSandbox();
  });

  afterEach(async function afterEach() {
    sandbox.restore();

    if (!nock.isDone()) {
      console.error('Not all nock interceptors were used!');
    }

    nock.cleanAll();
  });

  /**
   * Success isn't the contents of the response, but the type of HTTP Status Code response.
   */
  const setupReadWrite = (writeData: string, readData: string, responseText: string): Scope => {
    const scope = nock('http://127.0.0.1:9100', {
      allowUnmocked: false,
      reqheaders: {
        "content-type": "text/plain;charset=UTF-8",
        "referer": "about:blank",
        "user-agent": "Mozilla/5.0 (win32) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/20.0.1",
        "accept-language": "en",
        "accept": "*/*",
        "origin": "null",
        "accept-encoding": "gzip, deflate"
      }
    })
      .defaultReplyHeaders({
        'access-control-allow-origin': '*',
        'access-control-allow-credentials': 'true'
      })
      .post('/write', writeData)
      .once()
      .reply(200, '{}')
      .post('/read', readData)
      .once()
      .reply(200, responseText);

    return scope;
  }

  it('creates Printer (with Device) and tests Status', async () => {
    // NOTE: for nock() to accept matching "bodies" - request must match ORDERING.
    const deviceFields: DeviceFields = {
      name: "Zebra ZP 500 (ZPL)",
      uid: "Zebra ZP 500 (ZPL)",
      connection: "driver",
      deviceType: "printer",
      version: 3,
      provider: "com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider",
      manufacturer: "Zebra Technologies"
    }
    const device = new Device(deviceFields);
    const printer: Printer = new Printer(device);

    const writeBody = JSON.stringify({
      device: deviceFields,
      data: "~HQES" // \\~hs\r\n
    });

    
    const scope = setupReadWrite(writeBody, JSON.stringify({device: deviceFields}), getStatusResponse());

    const status = await printer.getStatusAsync();
    assert.strictEqual(status.headOpen, false, 'head should not be open');
    assert.strictEqual(status.paused, false, 'should not be paused');
    assert.strictEqual(status.paperOut, false, 'paper out should not be flagged');
    assert.strictEqual(status.ribbonOut, false, 'ribbon out should not be flagged');

    assert.ok(scope.isDone(), 'expecting scope to have completed');
  });

  it('creates Printer (with Device) and tests Status', async () => {
    // NOTE: for nock() to accept matching "bodies" - request must match ORDERING.
    const deviceFields: DeviceFields = {
      name: "Zebra ZP 500 (ZPL)",
      uid: "Zebra ZP 500 (ZPL)",
      connection: "driver",
      deviceType: "printer",
      version: 3,
      provider: "com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider",
      manufacturer: "Zebra Technologies"
    }
    const device = new Device(deviceFields);
    const printer: Printer = new Printer(device);

    const writeBody = JSON.stringify({
      device: deviceFields,
      data: "~HQES" // \\~hs\r\n
    });

    
    const scope = setupReadWrite(writeBody, JSON.stringify({device: deviceFields}), getStatusResponse({
      headOpen: true
    }));

    const status = await printer.getStatusAsync();
    assert.strictEqual(status.headOpen, true, 'head should be open');
    assert.strictEqual(status.paused, false, 'should not be paused');
    assert.strictEqual(status.paperOut, false, 'paper out should not be flagged');
    assert.strictEqual(status.ribbonOut, false, 'ribbon out should not be flagged');

    assert.ok(scope.isDone(), 'expecting scope to have completed');
  });
})