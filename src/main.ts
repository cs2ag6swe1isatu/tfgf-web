import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { protocol } from 'electron';

// Register the file protocol as secure (helps with local resource loading)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, allowServiceWorkers: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// having trouble on linux; disable HW acceleration there or when explicitly requested via env
if (process.platform === 'linux' || process.env.ELECTRON_DISABLE_HARDWARE_ACCELERATION === '1') {
  app.disableHardwareAcceleration();
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Support for multiple sessions for testing, remove later
if (process.env.SESSION_ID) {
  const currentPath = app.getPath('userData');
  app.setPath('userData', `${currentPath}-${process.env.SESSION_ID}`);
}

// IPC Handlers for player data persistence
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
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const queryPrefix = MAIN_WINDOW_VITE_DEV_SERVER_URL.includes('?') ? '&' : '?';
    const targetUrl = process.env.PAGE_TESTER
      ? `${MAIN_WINDOW_VITE_DEV_SERVER_URL}${queryPrefix}tester=${encodeURIComponent(process.env.PAGE_TESTER)}`
      : MAIN_WINDOW_VITE_DEV_SERVER_URL;
    mainWindow.loadURL(targetUrl);
  } else {
    const indexFile = path.join(__dirname, '..', 'renderer', MAIN_WINDOW_VITE_NAME, 'index.html');
    mainWindow.loadFile(indexFile).catch((err) => {
      console.error('Failed to load:', indexFile, err);
    });
  }

  mainWindow.webContents.openDevTools();
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
