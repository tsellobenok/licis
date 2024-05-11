import log from 'electron-log';
import { BrowserWindow } from 'electron';

import { showNotification } from './notifications';

import { ScrapeTask } from '../../types';

export const syncTask = (data: Partial<ScrapeTask>) => {
  log.info('Update task:', data);

  const [mainWindow] = BrowserWindow.getAllWindows();

  mainWindow.webContents.send('update-task', data);

  const STATUS_MESSAGE: Record<string, string> = {
    completed: 'was completed successfully',
    failed: 'failed',
    partial: 'was partially completed',
  };

  if (data.status && STATUS_MESSAGE[data.status]) {
    showNotification({
      title: `Scraping ${STATUS_MESSAGE[data.status]}`,
      body: data.failReason || '',
    });
  }
};
