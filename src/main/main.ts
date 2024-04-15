/* eslint global-require: off, no-console: off, promise/always-return: off */
import path from 'path';
import {
  app,
  BrowserWindow,
  Notification,
  shell,
  ipcMain,
  dialog,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'fs';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { scrape } from './scraper';
import { eventBus } from './scraper/utils/event-bus';
import { startBrowser } from './scraper/browser';
import { getLiAt } from './scraper/utils/auth';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('extract-company-info', async (event, args) => {
  try {
    await scrape(args);
  } catch (err) {
    eventBus.emit('update', {
      status: 'failed',
    });
    eventBus.emit('error', {
      details: err.message,
      message: 'Failed to scrape',
      stack: err.stack,
    });

    console.error(err);

    return err;
  }
});

ipcMain.handle('get-li-at', async () => {
  try {
    const content = fs.readFileSync(path.resolve('./config.json'), 'utf-8');

    if (!content) {
      return '';
    }

    return JSON.parse(content).liAt || '';
  } catch (err) {
    return '';
  }
});

ipcMain.handle('set-li-at', async (event, { liAt }: { liAt: string }) => {
  try {
    const content = fs.readFileSync(path.resolve('./config.json'), 'utf-8');

    let existing = {};

    try {
      existing = JSON.parse(content);
    } catch (err) {}

    return fs.writeFileSync(
      path.resolve('./config.json'),
      JSON.stringify({ ...existing, liAt }),
      'utf-8',
    );
  } catch (err) {
    return '';
  }
});

ipcMain.handle('connect-linkedin', async () => {
  const { browser, page } = await startBrowser(false);

  try {
    const liAt = await getLiAt(page);

    if (liAt) {
      fs.writeFileSync(
        path.resolve('./config.json'),
        JSON.stringify({
          liAt,
        }),
        'utf-8',
      );
    }
  } catch (err) {
    new Notification({
      title: `Failed to connect`,
      body: 'Try to get li_at cookie manually',
    }).show();
  }

  browser?.close();
});

ipcMain.handle('download', async (event, args) => {
  try {
    const fileContent = fs.readFileSync(path.resolve(args.path), 'utf-8');

    dialog
      .showSaveDialog(
        mainWindow,
        {
          title: 'Save results',
          defaultPath: 'results.csv',
        },
        fileContent,
      )
      .then(({ filePath }) => {
        fs.writeFileSync(filePath, fileContent, 'utf-8');
      })
      .catch(() => {
        new Notification({
          title: `Failed to download file`,
          body: 'Check results folder in the app directory',
        }).show();
      });
  } catch (error) {
    console.error(error);
  }
});

const STATUS_MESSAGE: Record<string, string> = {
  completed: 'was completed successfully',
  cancelled: 'was cancelled',
  failed: 'failed',
};

eventBus.on('update', (data) => {
  mainWindow?.webContents.send('update', data);

  if (data.status && STATUS_MESSAGE[data.status]) {
    new Notification({
      title: `Scraping ${STATUS_MESSAGE[data.status]}`,
      body: data.reason || '',
    }).show();
  }
});

eventBus.on('error', (data) => {
  new Notification({
    title: data.message,
    body: data.details || '',
  }).show();
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1366,
    height: 768,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    eventBus.emit('cancel');
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
