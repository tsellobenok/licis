import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { URL } from 'url';
import fs from 'fs';
import log from 'electron-log';

import { APP_NAME, RESULTS_FILENAME } from '../../const';
import { showNotification } from './notifications';

export const getAssetPath = (...paths: string[]): string => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../../assets');

  return path.join(RESOURCES_PATH, ...paths);
};

export const getChromeExecutablePath = () => {
  switch (process.platform) {
    case 'darwin': {
      return path.resolve(
        getAssetPath(),
        '.cache/puppeteer/chrome/mac_arm-121.0.6167.85/chrome-mac-arm64',
      );
    }
    case 'win32': {
      return path.resolve(
        getAssetPath(),
        '.cache/puppeteer/chrome/win-121.0.6167.85/win-x64',
      );
    }
    case 'linux': {
      return path.resolve(
        getAssetPath(),
        '.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome',
      );
    }
    default: {
      return './';
    }
  }
};

export const resolveHtmlPath = (htmlFileName: string) => {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);

    url.pathname = htmlFileName;

    return url.href;
  }

  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
};

export const getAppDataPath = () => {
  switch (process.platform) {
    case 'darwin': {
      return path.join(
        process.env.HOME || './',
        'Library',
        'Application Support',
        APP_NAME,
      );
    }
    case 'win32': {
      return path.join(process.env.APPDATA || './', APP_NAME);
    }
    case 'linux': {
      return path.join(process.env.HOME || './', `.${APP_NAME}`);
    }
    default: {
      return './';
    }
  }
};

export const writeAppFile = (
  filePath: string,
  fileName: string,
  data: string,
) => {
  if (!fs.existsSync(path.resolve(getAppDataPath(), filePath))) {
    fs.mkdirSync(path.resolve(getAppDataPath(), filePath), { recursive: true });
  }

  fs.writeFileSync(
    path.resolve(getAppDataPath(), filePath, fileName),
    data,
    'utf-8',
  );
};

export const readAppFile = (filePath: string) =>
  fs.readFileSync(path.resolve(getAppDataPath(), filePath), 'utf-8');

export const createWriteStream = (filePath: string, fileName: string) => {
  if (!fs.existsSync(path.resolve(getAppDataPath(), filePath))) {
    fs.mkdirSync(path.resolve(getAppDataPath(), filePath), { recursive: true });
  }

  return fs.createWriteStream(
    path.resolve(getAppDataPath(), filePath, fileName),
  );
};

export const downloadFile = async (filePath: string, fileName: string) => {
  try {
    const [mainWindow] = BrowserWindow.getAllWindows();

    if (!mainWindow) {
      return;
    }

    const dialogResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Save results',
      defaultPath: fileName || RESULTS_FILENAME,
    });

    if (dialogResult.canceled) {
      return;
    }

    if (!dialogResult.filePath) {
      throw new Error('No file path specified');
    }

    const fileContent = readAppFile(filePath);

    fs.writeFileSync(dialogResult.filePath, fileContent, 'utf-8');
  } catch (error) {
    log.error('Cannot download file');
    log.error(error);

    showNotification({
      title: `Failed to save file`,
      body: (error as Error).message.includes('No file path specified')
        ? 'Specify where to save file, please'
        : 'Please try again. Or contact support if issue persists.',
    });
  }
};
