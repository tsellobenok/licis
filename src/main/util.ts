/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';

import { APP_NAME, CONFIG_PATH } from '../const';

import { AppConfig } from '../types';

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

export const getConfig = (): Partial<AppConfig> => {
  let result = {};

  if (!fs.existsSync(path.resolve(getAppDataPath(), CONFIG_PATH))) {
    return result;
  }

  try {
    result = JSON.parse(readAppFile(CONFIG_PATH));
  } catch (err) {
    log.info('Cannot parse config. ', err);
  }

  return result || {};
};

export const updateConfig = (newConfig: Partial<AppConfig>) => {
  log.info('Updating config', newConfig);

  writeAppFile(
    './',
    CONFIG_PATH,
    JSON.stringify({
      ...getConfig(),
      ...newConfig,
    }),
  );
};
