import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as dgram from 'node:dgram';
import * as zlib from 'node:zlib';
import * as http from 'node:http';
import mdns from 'multicast-dns';
import started from 'electron-squirrel-startup';

// Disable sandbox if running as root OR if explicitly requested via environment
if ((process.getuid && process.getuid() === 0) || process.env.DISABLE_ELECTRON_SANDBOX === '1') {
  app.commandLine.appendSwitch('no-sandbox');
}

const BROADCAST_PORT = 41234;
const BROADCAST_ADDR = "255.255.255.255";
const MDNS_NAME = 'tfgf-discovery.local';

let udpSocket: dgram.Socket | null = null;
let mainWindow: BrowserWindow | null = null;
let httpServer: http.Server | null = null;
let currentQuestionsData: string = "";
const m = mdns();

function ipv4ToInt(address: string): number {
  return address
    .split('.')
    .reduce((accumulator, part) => ((accumulator << 8) | (Number(part) & 0xff)) >>> 0, 0);
}

function intToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join('.');
}

function getBroadcastAddress(address: string, netmask: string): string {
  const ip = ipv4ToInt(address);
  const mask = ipv4ToInt(netmask);
  return intToIpv4((ip & mask) | (~mask >>> 0));
}

function getLocalNetworkInterfaces() {
  const nets = os.networkInterfaces();
  const candidates: { name: string; address: string; netmask: string; internal: boolean }[] = [];

  for (const name of Object.keys(nets)) {
    const interfaces = nets[name];
    if (!interfaces) continue;

    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('docker') ||
      lowerName.includes('vbox') ||
      lowerName.includes('vmware') ||
      lowerName.includes('vnet') ||
      lowerName.includes('virtual') ||
      lowerName.includes('tun') ||
      lowerName.includes('tap') ||
      lowerName.includes('wsl')
    ) {
      continue;
    }

    for (const net of interfaces) {
      if (net.family !== 'IPv4' || !net.netmask) continue;
      candidates.push({ name, address: net.address, netmask: net.netmask, internal: net.internal });
    }
  }

  return candidates;
}

function getUdpTargets(address: string): string[] {
  if (address !== BROADCAST_ADDR) return [address];

  const targets = new Set<string>([BROADCAST_ADDR]);
  for (const net of getLocalNetworkInterfaces()) {
    if (net.internal) continue;
    targets.add(getBroadcastAddress(net.address, net.netmask));
  }

  return [...targets];
}

// mDNS Response Listener (for Clients)
m.on('response', (response) => {
  const aRecord = response.answers.find(a => a.name === MDNS_NAME && a.type === 'A');
  const txtRecord = response.answers.find(a => a.name === MDNS_NAME && a.type === 'TXT');

  if (aRecord && mainWindow) {
    // Forward the discovered IP to the renderer to trigger a Direct Join probe
    mainWindow.webContents.send('multiplayer:mdns-host-found', aRecord.data);
  }
});

// mDNS Query Listener (for Hosts)
let isMdnsAdvertising = false;
let currentLobbyId = '';

m.on('query', (query) => {
  if (isMdnsAdvertising && query.questions.some(q => q.name === MDNS_NAME)) {
    m.respond({
      answers: [{
        name: MDNS_NAME,
        type: 'TXT',
        data: `lobbyId=${currentLobbyId}`
      }, {
        name: MDNS_NAME,
        type: 'A',
        data: getLocalIp() // Uses our robust detection logic
      }]
    });
  }
});

function getLocalIp(): string {
  const os = require('os');
  const nets = os.networkInterfaces();
  const candidates: { address: string; internal: boolean; name: string }[] = [];

  for (const name of Object.keys(nets)) {
    const interfaces = nets[name];
    if (!interfaces) continue;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('docker') || lowerName.includes('vbox') || lowerName.includes('vmware') || lowerName.includes('vnet') || lowerName.includes('virtual') || lowerName.includes('tun') || lowerName.includes('tap') || lowerName.includes('wsl')) continue;
    for (const net of interfaces) {
      if (net.family === 'IPv4') {
        candidates.push({ address: net.address, internal: net.internal, name });
      }
    }
  }
  const lanMatch = candidates.find(c => !c.internal && (c.address.startsWith('192.168.') || c.address.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(c.address)));
  if (lanMatch) return lanMatch.address;
  const externalMatch = candidates.find(c => !c.internal);
  if (externalMatch) return externalMatch.address;
  return '127.0.0.1';
}

ipcMain.on('multiplayer:mdns-start-adv', (_event, lobbyId: string) => {
  isMdnsAdvertising = true;
  currentLobbyId = lobbyId;
  console.log(`[main] mDNS advertising started for lobby ${lobbyId}`);
});

ipcMain.on('multiplayer:mdns-stop-adv', () => {
  isMdnsAdvertising = false;
  console.log('[main] mDNS advertising stopped');
});

ipcMain.on('multiplayer:mdns-query', () => {
  m.query(MDNS_NAME, 'A');
});

// Initialize UDP Socket in Main Process ...
function initUdpSocket() {
  if (udpSocket) return;

  udpSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  udpSocket.on("error", (err) => {
    console.error('[main] UDP SOCKET ERROR:', err);
  });

  udpSocket.on("message", (msg, rinfo) => {
    if (mainWindow) {
      let data = msg;
      // Simple check for zlib header (0x78 0x01, 0x78 0x9c, 0x78 0xda)
      if (msg.length > 2 && msg[0] === 0x78) {
        try {
          data = zlib.inflateSync(msg);
        } catch (e) {
          console.error('[main] UDP decompression failed:', e);
        }
      }
      mainWindow.webContents.send('multiplayer:udp-message', data.toString(), rinfo.address);
    }
  });

  udpSocket.bind(BROADCAST_PORT, () => {
    try {
      udpSocket?.setBroadcast(true);
      console.log(`[main] UDP socket bound to port ${BROADCAST_PORT} with broadcast enabled`);
    } catch (err) {
      console.error('[main] setBroadcast failed:', err);
    }
  });
}

ipcMain.on('multiplayer:udp-send', (_event, message: string, address: string = BROADCAST_ADDR) => {
  if (!udpSocket) initUdpSocket();
  let data = Buffer.from(message);
  
  // Compress if large (e.g. lobby snapshots or game state)
  if (data.length > 800) {
    try {
      data = zlib.deflateSync(data);
    } catch (e) {
      console.warn('[main] UDP compression failed:', e);
      data = Buffer.from(message); // Send uncompressed if failed
    }
  }

  const targets = getUdpTargets(address);
  if (targets.length > 1) {
    console.log('[main] UDP fanout targets:', targets.join(', '));
  }

  targets.forEach((target) => {
    udpSocket?.send(data, 0, data.length, BROADCAST_PORT, target, (err) => {
      if (err) console.warn('[main] UDP send error:', { target, err });
    });
  });
});

// HTTP Server for large data transfer
ipcMain.on('multiplayer:start-http-server', (event, data: string) => {
  if (httpServer) {
    httpServer.close();
  }
  
  const startTime = Date.now();
  console.log(`[main] HTTP server startup requested at ${startTime}`);
  
  currentQuestionsData = data;
  httpServer = http.createServer((req, res) => {
    if (req.url === '/questions') {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Allow clients to fetch from their origin
      });
      res.end(currentQuestionsData);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(0, '0.0.0.0', () => {
    const port = (httpServer?.address() as any)?.port;
    const elapsedMs = Date.now() - startTime;
    console.log(`[main] HTTP server listening on port ${port} (${elapsedMs}ms after startup request)`);
    event.reply('multiplayer:http-server-started', port);
  });
  
  // Add error handler to log HTTP server issues
  httpServer.on('error', (err) => {
    console.error(`[main] HTTP server error:`, err);
  });
});

ipcMain.on('multiplayer:stop-http-server', () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
    currentQuestionsData = "";
    console.log('[main] HTTP server stopped');
  }
});

// player storage handlers ...
const getPlayerDataPath = (): string => {
  const userDataPath = app.getPath('userData');
  // Ensure the directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'player.json');
};

ipcMain.handle('player-storage:read', async () => {
  try {
    const filePath = getPlayerDataPath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error reading player data:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('player-storage:write', async (_event, data: string) => {
  try {
    const filePath = getPlayerDataPath();
    fs.writeFileSync(filePath, data, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing player data:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('player-storage:delete', async () => {
  try {
    const filePath = getPlayerDataPath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting player data:', error);
    return { success: false, error: String(error) };
  }
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      backgroundThrottling: false,
      webSecurity: false,        // allows file:// to load local assets in packaged app
    },
  });

  initUdpSocket();

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const pageTester = process.env.PAGE_TESTER;
    const queryPrefix = MAIN_WINDOW_VITE_DEV_SERVER_URL.includes('?') ? '&' : '?';
    const targetUrl = pageTester
      ? `${MAIN_WINDOW_VITE_DEV_SERVER_URL}${queryPrefix}tester=${encodeURIComponent(pageTester)}`
      : MAIN_WINDOW_VITE_DEV_SERVER_URL;
    mainWindow.loadURL(targetUrl);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools only in dev
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
