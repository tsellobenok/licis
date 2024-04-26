/* eslint import/prefer-default-export: off */
import fs from 'fs';
import path from 'path';
import log from 'electron-log';

import { CONFIG_PATH } from '../../const';
import { getAppDataPath, readAppFile, writeAppFile } from './files';

import { AppConfig } from '../../types';

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
