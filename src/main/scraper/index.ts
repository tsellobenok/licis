import log from 'electron-log';

import { pageHandler as getCompanyInfo } from './handlers/company-info';

import { eventBus } from '../event-bus';
import { startBrowser, startBrowserAndLogin } from './browser';
import { createWriteStream } from '../util';
import { getLiAt } from './utils/auth';

import { ScrapeProps } from '../../types';
import { RESULTS_FILENAME, RESULTS_PATH } from '../../const';
import { getTaskStatus } from './utils/tasks';

const SCRAPERS = {
  'company-info': getCompanyInfo,
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
  const { liAt, timeout, urls, type = 'company-info' } = props;
  const { page, stopBrowser } = await startBrowserAndLogin(liAt);

  const onStopScraping = () => {
    stopBrowser();
    log.error('Scrapping forcefully stopped');
  };

  eventBus.on('stop-scraping', onStopScraping);

  try {
    let aborted = false;
    let abortReason = 'Something went wrong';

    page.on('response', (response) => {
      if (response.status() === 999) {
        log.error('Got 999 status code. LinkedIn session expired');
        aborted = true;
        abortReason = 'LinkedIn session expired. Reconnect it, please';
      }
    });

    eventBus.emit('update-task', {
      current: 0,
      status: 'in-progress',
      total: urls.length,
    });

    const writeableStreamCsv = createWriteStream(
      RESULTS_PATH,
      RESULTS_FILENAME,
    );

    log.info('Created results file');

    let successCount = 0;
    let failCount = 0;
    let current = 0;

    writeableStreamCsv.write(
      `URL,Name,Industry,Location,Size,Website,Specialties,Revenue,Open Jobs,Employees,People per location,Status\n`,
    );

    for (const url of urls) {
      try {
        current++;

        log.info(`Starting scraping ${current} of ${urls.length}: `, url);

        eventBus.emit('update-task', {
          current,
        });

        const result = await SCRAPERS[type](url, page, timeout);

        writeableStreamCsv.write(
          `${Object.values(result)
            .map((r) => `"${r || ''}"`)
            .join(',')}\n`,
        );

        if (result && result?.status !== 'failed') {
          successCount++;
          log.info(`Scraped ${current} of ${urls.length}: `, url);
        } else {
          failCount++;
          log.info(`Failed to scrape ${current} of ${urls.length}: `, url);
        }

        eventBus.emit('update-task', {
          successCount,
          failCount,
        });
      } catch (err) {
        log.error(`Error at ${current} of ${urls.length}: `, url);
        log.error(err);

        failCount++;

        eventBus.emit('update-task', {
          failCount,
        });
      }

      if (aborted) {
        throw new Error(abortReason);
      }
    }

    eventBus.emit('update-task', {
      status: getTaskStatus({ successCount, total: urls.length }),
    });
  } catch (err) {
    const { message } = err as Error;

    eventBus.emit('update-task', {
      status: 'failed',
      failReason: message,
    });

    log.error('Error while scraping', message);
  }

  eventBus.off('stop-scraping', onStopScraping);

  stopBrowser();
};
