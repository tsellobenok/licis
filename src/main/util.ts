/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';
import json from '../../package.json';
import fs from 'fs';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

const APP_NAME = json.build.productName;

export const getAppDataPath = () => {
  switch (process.platform) {
    case 'darwin': {
      return path.join(
        process.env.HOME,
        'Library',
        'Application Support',
        APP_NAME,
      );
    }
    case 'win32': {
      return path.join(process.env.APPDATA, APP_NAME);
    }
    case 'linux': {
      return path.join(process.env.HOME, `.${APP_NAME}`);
    }
    default: {
      console.log('Unsupported platform!');
      process.exit(1);
    }
  }
};

export const writeFile = (filePath: string, filename: string, data: string) => {
  if (!fs.existsSync(path.resolve(getAppDataPath(), filePath))) {
    fs.mkdirSync(path.resolve(getAppDataPath(), filePath), { recursive: true });
  }

  fs.writeFileSync(
    path.resolve(getAppDataPath(), filePath, filename),
    data,
    'utf-8',
  );
};

export const createWriteStream = (filePath: string, filename: string) => {
  if (!fs.existsSync(path.resolve(getAppDataPath(), filePath))) {
    fs.mkdirSync(path.resolve(getAppDataPath(), filePath), { recursive: true });
  }

  return fs.createWriteStream(
    path.resolve(getAppDataPath(), filePath, filename),
  );
};
