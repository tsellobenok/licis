import { ipcMain, shell } from 'electron';

import { scrape } from '../scraper';
import { downloadFile } from './files';
import {
  checkAndGetConfig,
  connectToLinkedIn,
  getConfig,
  updateConfig,
} from './config';

export const initHandlers = () => {
  ipcMain.handle('scrape', async (_, args) => scrape(args));

  ipcMain.handle('check-and-get-config', () => checkAndGetConfig());
  ipcMain.handle('get-config', () => getConfig());
  ipcMain.handle('update-config', (_, configStr: string) =>
    updateConfig(configStr),
  );
  ipcMain.handle('connect-linkedin', (_, creds) => connectToLinkedIn(creds));
  ipcMain.handle('open-in-browser', (_, url: string) =>
    shell.openExternal(url),
  );

  ipcMain.handle('download', async (_, args) =>
    downloadFile(args.path, args.fileName),
  );
};
