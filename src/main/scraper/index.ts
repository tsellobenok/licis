import log from 'electron-log';

import { scrapeCompanyInfo } from './handlers/company-info';
import { scrapeCompanyJobs } from './handlers/company-jobs';

import { eventBus } from '../event-bus';
import { getConfig } from '../utils/config';
import { showNotification } from '../utils/notifications';
import { syncTask } from '../utils/renderer-communication';
import { startBrowserAndLogin } from './browser';

import { ScrapeProps, TaskStatus } from '../../types';

const SCRAPERS = {
  'company-info': scrapeCompanyInfo,
  'company-jobs': scrapeCompanyJobs,
};

export const scrape = async (props: ScrapeProps) => {
  const { accounts, jobLocation, raiseTheHood, getLocations } = getConfig();
  const selectedAccount = accounts?.find((acc) => acc.selected);

  if (!selectedAccount || !selectedAccount?.liAt) {
    log.error(
      'Cannot start scraping. No account selected or no liAt in the account',
    );

    syncTask({
      current: props.urls.length,
      failCount: props.urls.length,
      status: TaskStatus.Failed,
    })

    showNotification({
      body: 'Linkedin connection is required',
      title: `Failed to start scraping`,
    });

    eventBus.emit('stop-browser');

    return;
  }

  const { urls, type = 'company-info', ...rest } = props;
  const { page } = await startBrowserAndLogin(
    selectedAccount.liAt,
    raiseTheHood,
  );

  await SCRAPERS[type]({
    getLocations,
    jobLocation,
    page,
    urls,
    ...rest,
  });

  eventBus.emit('stop-browser');
};
