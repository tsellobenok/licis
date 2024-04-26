import { BrowserWindow, dialog, ipcMain, Notification } from 'electron';
import fs from 'fs';
import log from 'electron-log';

import { connectToLinkedIn, scrape } from './scraper';
import { eventBus } from './event-bus';
import { getConfig, updateConfig } from './utils/config';
import { readAppFile } from './utils/files';
import { RESULTS_FILENAME } from '../const';

export const initHandlers = () => {
  ipcMain.handle('scrape', async (event, args) => {
    await scrape(args);
  });

  ipcMain.handle('get-config', () => getConfig());
  ipcMain.handle('update-config', (_, args) => updateConfig(args));
  ipcMain.handle('connect-linkedin', () => connectToLinkedIn());

  ipcMain.handle('download', async (_, args) => {
    try {
      const [mainWindow] = BrowserWindow.getAllWindows();

      if (!mainWindow) {
        return;
      }

      const results = await dialog.showSaveDialog(mainWindow, {
        title: 'Save results',
        defaultPath: args.fileName || RESULTS_FILENAME,
      });

      if (!results?.filePath) {
        throw new Error('No file path specified');
      }

      const fileContent = readAppFile(args.path);

      fs.writeFileSync(results.filePath, fileContent, 'utf-8');
    } catch (error) {
      log.error('Cannot download results file');
      log.error(error);

      if ((error as Error).message.includes('No file path specified')) {
        eventBus.emit('notification', {
          title: `Specify where to save file, please`,
        });
      } else {
        eventBus.emit('notification', {
          title: `Failed to download file`,
          body: 'Please try again. Or contact support if issue persists.',
        });
      }

      eventBus.emit('notification', {
        title: `Failed to download file`,
        body: 'Please try again. Or contact support if issue persists.',
      });
    }
  });

  const STATUS_MESSAGE: Record<string, string> = {
    completed: 'was completed successfully',
    failed: 'failed',
    partial: 'was partially completed',
  };

  eventBus.on('end-time-update', (data) => {
    log.info('Update time left:', data);

    const [mainWindow] = BrowserWindow.getAllWindows();

    mainWindow.webContents.send('end-time-update', data);
  });

  eventBus.on('update-task', (data) => {
    log.info('Update task:', data);

    const [mainWindow] = BrowserWindow.getAllWindows();

    mainWindow.webContents.send('update-task', data);

    if (data.status && STATUS_MESSAGE[data.status]) {
      eventBus.emit('notification', {
        title: `Scraping ${STATUS_MESSAGE[data.status]}`,
        body: data.failReason || '',
      });
    }
  });

  eventBus.on('notification', (data) => {
    new Notification({
      title: data.title,
      body: data.body || '',
    }).show();
  });
};
