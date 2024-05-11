import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';

import { CONFIG_PATH } from '../../const';
import { getAppDataPath, readAppFile, writeAppFile } from './files';

import { eventBus } from '../event-bus';
import { getAccountMeta } from '../scraper/utils/auth';
import { showNotification } from './notifications';
import { startBrowser, startBrowserAndLogin } from '../scraper/browser';

import { Account, AccountCredentials, AppConfig } from '../../types';

export const getConfig = (): AppConfig | Partial<AppConfig> => {
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

export const updateConfig = (configStr: string) => {
  log.info('Updating config', JSON.parse(configStr));

  writeAppFile(
    './',
    CONFIG_PATH,
    JSON.stringify({
      ...getConfig(),
      ...JSON.parse(configStr),
    }),
  );

  const updatedConfig = getConfig();
  const [mainWindow] = BrowserWindow.getAllWindows();

  mainWindow.webContents.send('config-updated', updatedConfig);

  return updatedConfig;
};

export const getSelectedAccount = async (): Promise<Account | null> =>
  getConfig()?.accounts?.find((acc) => acc.selected) || null;

export const checkAndGetConfig = async (): Promise<
  AppConfig | Partial<AppConfig>
> => {
  log.info('Start config check...');

  try {
    const selectedAccount = await getSelectedAccount();

    if (!selectedAccount) {
      log.info('No account selected!');

      return getConfig();
    }

    log.info(`Found an account ${selectedAccount.name}`);

    if (!selectedAccount.liAt) {
      log.error('No liAt in account');

      return getConfig();
    }

    const { page } = await startBrowserAndLogin(selectedAccount.liAt);

    await page.goto('https://www.linkedin.com/feed/');

    log.info(`Went to feed page`);

    await page.waitForSelector('.feed-identity-module__actor-meta', {
      timeout: 10000,
    });

    log.info(`Found feed page element`);
  } catch (err) {
    log.error('Failed to check LinkedIn connectivity:');
    log.error(err);

    showNotification({
      title: `Failed to check connectivity to LinkedIn`,
      body: 'Try to reconnect currently selected account',
    });

    const { accounts } = getConfig();

    updateConfig(
      JSON.stringify({
        accounts:
          accounts?.map((acc) =>
            acc.selected
              ? {
                  ...acc,
                  liAt: null,
                }
              : acc,
          ) || [],
      }),
    );
  }

  eventBus.emit('stop-browser');

  return getConfig();
};

export const connectToLinkedIn = async (
  creds: AccountCredentials,
): Promise<null | Partial<Account>> => {
  const { browser, page } = await startBrowser(true);

  log.info('Start connection to LinkedIn with creds: ', creds);

  let accountMeta = null;

  try {
    accountMeta = await getAccountMeta(page, creds);

    log.info('Got account meta:', accountMeta);
  } catch (err) {
    log.error('Failed to get account meta:');
    log.error(err);

    showNotification({
      title: `Failed to connect to LinkedIn`,
      body: 'Try to add account manually',
    });
  }

  browser?.close();

  return accountMeta;
};
