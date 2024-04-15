import fs from 'fs';
import path from 'path';

import { pageHandler as getCompanyInfo } from './handlers/company-info';

import { eventBus } from './utils/event-bus';
import { startBrowserAndLogin } from './browser';

interface ScrapeProps {
  liAt: string;
  timeout: number;
  urls: string[];
}

export const scrape = async ({ liAt, timeout, urls }: ScrapeProps) => {
  const { page, stopBrowser } = await startBrowserAndLogin(liAt);

  let isCancelled = false;
  let cancelReason = 'Something went wrong. Please try again.';

  const onCancel = (args) => {
    stopBrowser();
    cancelReason = args.message;
    isCancelled = true;
  };

  eventBus.on('cancel', onCancel);

  try {
    eventBus.emit('update', {
      current: 0,
      status: 'in-progress',
      total: urls.length,
    });

    if (!fs.existsSync('./results')) {
      fs.mkdirSync('./results');
    }

    const writeableStreamCsv = fs.createWriteStream(
      path.resolve(`./results/results.csv`),
    );

    let successCount = 0;
    let failCount = 0;
    let current = 0;

    writeableStreamCsv.write(
      `URL,Name,Website,Size,Industry,Headquarters,Tagline,Scrape status\n`,
    );

    for (const url of urls) {
      if (isCancelled) {
        eventBus.emit('update', {
          status: 'failed',
          reason: cancelReason,
        });

        break;
      }

      try {
        current++;

        eventBus.emit('update', {
          current,
        });

        const result = await getCompanyInfo(url, page, timeout);

        if (result && result.status !== 'failed') {
          writeableStreamCsv.write(
            `${Object.values(result)
              .map((r) => `"${r}"`)
              .join(',')}\n`,
          );

          successCount++;

          eventBus.emit('update', {
            successCount,
          });
        } else {
          failCount++;

          eventBus.emit('update', {
            failCount,
          });
        }
      } catch (err) {
        failCount++;

        eventBus.emit('update', {
          failCount,
        });
      }
    }

    if (!isCancelled) {
      eventBus.emit('update', {
        status: 'completed',
      });
    }
  } catch (err) {
    console.error(err);

    eventBus.emit('update', {
      status: 'failed',
    });
    eventBus.emit('error', {
      details: err.message,
      message: 'Failed to scrape',
      stack: err.stack,
    });
  }

  eventBus.off('cancel', onCancel);

  stopBrowser();
};
