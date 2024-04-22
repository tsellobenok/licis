import log from 'electron-log';

import { scrapeCompanyInfo } from './handlers/company-info';
import { scrapeCompanyJobs } from './handlers/company-jobs';

import { eventBus } from '../event-bus';
import { startBrowser, startBrowserAndLogin } from './browser';
import { getLiAt } from './utils/auth';

import { ScrapeProps } from '../../types';

const SCRAPERS = {
  'company-info': scrapeCompanyInfo,
  'company-jobs': scrapeCompanyJobs,
};

export const connectToLinkedIn = async () => {
  const { browser, page } = await startBrowser(false);

  log.info('Start connection to LinkedIn...');

  let liAt = '';

  try {
    liAt = await getLiAt(page);

    log.info('Got li_at:', liAt);
  } catch (err) {
    log.error('Failed to get li_at:', err);

    eventBus.emit('notification', {
      title: `Failed to connect to LinkedIn`,
      body: 'Try to get li_at cookie manually',
    });
  }

  browser?.close();

  return liAt;
};

export const scrape = async (props: ScrapeProps) => {
  const { liAt, urls, type = 'company-info', ...rest } = props;
  const { page, stopBrowser } = await startBrowserAndLogin(liAt);

  const onStopScraping = () => {
    stopBrowser();
    log.error('Scrapping forcefully stopped');
  };

  eventBus.on('stop-scraping', onStopScraping);

  await SCRAPERS[type]({
    page,
    urls,
    ...rest,
  });

  eventBus.off('stop-scraping', onStopScraping);

  stopBrowser();
};
