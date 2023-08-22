import nock, { Scope } from 'nock';
// const nock: any = {}; // disable nock if you have a printer connected locally
import 'jsdom-global/register'
import { Device, DeviceFields } from '../src/Device'
import { Printer } from '../src/Printer';
import { createSandbox, SinonSandbox } from 'sinon';
import assert from 'assert';

// This does not match the other Zebra printers, which have a long single stream of digits.
const STATUS_OK = `

PRINTER STATUS                            
 ERRORS:         0 00000000 00000000      
 WARNINGS:       0 00000000 00000000      
`;

const STATUS_PAPER_OUT = `

PRINTER STATUS                            
 ERRORS:         1 00000000 00010001      
 WARNINGS:       0 00000000 00000000      
`;

const CONFIGURATION_ZT411 = `  +15.0               DARKNESS          
4.0 IPS             PRINT SPEED       
+000                TEAR OFF ADJUST   
CUTTER              PRINT MODE        
GAP/NOTCH           MEDIA TYPE        
TRANSMISSIVE        SENSOR SELECT     
DIRECT-THERMAL      PRINT METHOD      
661                 PRINT WIDTH       
1812                LABEL LENGTH      
41001-97/2212-06376 PRINT HEAD ID     
15.0IN   380MM      MAXIMUM LENGTH    
MAINT. OFF          EARLY WARNING     
NOT CONNECTED       USB COMM.         
BIDIRECTIONAL       PARALLEL COMM.    
RS232               SERIAL COMM.      
9600                BAUD              
8 BITS              DATA BITS         
NONE                PARITY            
XON/XOFF            HOST HANDSHAKE    
NONE                PROTOCOL          
NORMAL MODE         COMMUNICATIONS    
<~>  7EH            CONTROL PREFIX    
<^>  5EH            FORMAT PREFIX     
<,>  2CH            DELIMITER CHAR    
ZPL II              ZPL MODE          
INACTIVE            COMMAND OVERRIDE  
CALIBRATION         MEDIA POWER UP    
CALIBRATION         HEAD CLOSE        
DEFAULT             BACKFEED          
+000                LABEL TOP         
+0000               LEFT POSITION     
OFF                 APPLICATOR PORT   
ENABLED             ERROR ON PAUSE    
PULSE MODE          START PRINT SIG   
DISABLED            REPRINT MODE      
039                 WEB SENSOR        
080                 MEDIA SENSOR      
255                 TAKE LABEL        
027                 MARK SENSOR       
027                 MARK MED SENSOR   
002                 TRANS GAIN        
097                 TRANS BASE        
056                 TRANS LED         
002                 MARK GAIN         
096                 MARK LED          
DPCSWFXM            MODES ENABLED     
........            MODES DISABLED    
1248 12/MM FULL     RESOLUTION        
6.7                 LINK-OS VERSION   
V92.21.17Z <-       FIRMWARE          
1.3                 XML SCHEMA        
7.0.1 32.6          HARDWARE ID       
8176k............R: RAM               
65536k...........E: ONBOARD FLASH     
NONE                FORMAT CONVERT    
FW VERSION          IDLE DISPLAY      
05/09/23            RTC DATE          
17:53               RTC TIME          
DISABLED            ZBI               
2.1                 ZBI VERSION       
READY               ZBI STATUS        
267 LABELS          NONRESET CNTR     
267 LABELS          RESET CNTR1       
267 LABELS          RESET CNTR2       
2,300 IN            NONRESET CNTR     
2,300 IN            RESET CNTR1       
2,300 IN            RESET CNTR2       
5,842 CM            NONRESET CNTR     
5,842 CM            RESET CNTR1       
5,842 CM            RESET CNTR2       
*** EMPTY           SLOT 1            
*** EMPTY           SLOT 2            
0                   MASS STORAGE COUNT
0                   HID COUNT         
OFF                 USB HOST LOCK OUT 
`;

const INFO = `ZT411-300dpi,V92.21.17Z,12,8176KB,CUTTER DETECTED`;

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