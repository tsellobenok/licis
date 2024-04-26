import { app } from 'electron';
import path from 'path';
import { URL } from 'url';
import fs from 'fs';

import { APP_NAME } from '../../const';

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
        '.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64',
      );
    }
    case 'win32': {
      return path.resolve(
        getAssetPath(),
        '.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64',
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
  filename: string,
  data: string,
) => {
  if (!fs.existsSync(path.resolve(getAppDataPath(), filePath))) {
    fs.mkdirSync(path.resolve(getAppDataPath(), filePath), { recursive: true });
  }

  fs.writeFileSync(
    path.resolve(getAppDataPath(), filePath, filename),
    data,
    'utf-8',
  );
};

export const readAppFile = (filePath: string) =>
  fs.readFileSync(path.resolve(getAppDataPath(), filePath), 'utf-8');

export const createWriteStream = (filePath: string, filename: string) => {
  if (!fs.existsSync(path.resolve(getAppDataPath(), filePath))) {
    fs.mkdirSync(path.resolve(getAppDataPath(), filePath), { recursive: true });
  }

  return fs.createWriteStream(
    path.resolve(getAppDataPath(), filePath, filename),
  );
};
