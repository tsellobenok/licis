import { Page } from 'puppeteer';
import log from 'electron-log';
import { eventBus } from '../../event-bus';
import { createWriteStream } from '../../utils/files';
import { RESULTS_FILENAME, RESULTS_PATH } from '../../../const';
import { getTaskStatus } from '../utils/tasks';
import { JobResult } from '../../../types';

const parsePage = async ({
  page,
  parsedJobsCount,
}: {
  parsedJobsCount: number;
  page: Page;
}): Promise<JobResult[]> => {
  const jobsList = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        'ul.scaffold-layout__list-container li.jobs-search-results__list-item',
      ),
    ),
  );

  const jobs = [];

  for (let currentJob = 0; currentJob < jobsList.length; currentJob++) {
    await page.click(
      `ul.scaffold-layout__list-container li:nth-child(${currentJob + 1})`,
    );
    await page.waitForTimeout(1000 + Math.round(Math.random() * 1000));

    const result: JobResult = await page.evaluate((current) => {
      const el = document.querySelector(
        `ul.scaffold-layout__list-container li:nth-child(${current + 1})`,
      );

      const url = ((el as HTMLElement).querySelector('a') as HTMLAnchorElement)
        ?.href;
      const title = (
        document.querySelector(
          '.job-details-jobs-unified-top-card__job-title',
        ) as HTMLAnchorElement
      )?.innerText;
      const [companyName, location, whenPosted, numberOfApplicants] =
        (
          document.querySelector(
            '.job-details-jobs-unified-top-card__primary-description-without-tagline',
          ) as HTMLAnchorElement
        )?.innerText?.split(' · ') || [];
      const description = (
        document.querySelector('.jobs-description-content__text') as HTMLElement
      )?.innerText;

      return {
        url,
        companyName,
        title,
        description,
        location,
        whenPosted,
        numberOfApplicants,
      };
    }, currentJob);

    jobs.push(result);

    eventBus.emit('update-task', {
      jobs: parsedJobsCount + jobs.length,
    });
  }

  return jobs;
};

const pageHandler = async ({
  jobLocation = 'Worldwide',
  page,
  timeout = 3000,
  url,
}: {
  jobLocation?: string;
  page: Page;
  timeout: number;
  url: string;
}): Promise<{ jobs: JobResult[]; status: string; url: string }> => {
  const dataObj = {
    jobs: [],
    status: 'in-progress',
    url,
  };

  try {
    const jobsPage = `${url.replace(/\/$/, '')}/jobs`;

    await page.goto(jobsPage);
    await page.waitForTimeout(2000);

    // Return null if page is unavailable
    const currentPageUrl = await page.url();

    if (
      currentPageUrl.includes('authwall') ||
      currentPageUrl.includes('unavailable') ||
      currentPageUrl.includes('/404')
    ) {
      return {
        ...dataObj,
        status: 'failed',
      };
    }

    // Wait for elements to load
    try {
      await page.waitForSelector(
        '.org-jobs-job-search-form-module__action-container a',
        {
          timeout: 5000,
        },
      );
    } catch (err) {
      log.error(`Can't find required element on the page ${url}`);
      log.error(err);

      return {
        ...dataObj,
        status: 'failed',
      };
    }

    // Go to search jobs page
    await page.evaluate(() => {
      const search = document.querySelector(
        '.org-jobs-job-search-form-module__action-container a',
      ) as HTMLAnchorElement;

      search.target = '_self';
      search.click();
    });

    await page.waitForSelector('ul.scaffold-layout__list-container');

    await page.click('input[aria-label="City, state, or zip code"]', {
      count: 2,
    });

    await page.type(
      'input[aria-label="City, state, or zip code"]',
      jobLocation,
    );
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(10000);

    const totalPages = await page.evaluate(() => {
      const paginationItems = Array.from(
        document.querySelectorAll('ul.artdeco-pagination__pages li'),
      );

      return (
        Number(
          (paginationItems[paginationItems.length - 1] as HTMLLIElement)
            ?.dataset.testPaginationPageBtn,
        ) || 1
      );
    });

    log.info('Total pages: ', totalPages);

    for (let currentPage = 1; currentPage < totalPages + 1; currentPage++) {
      log.info(`Started scraping page #${currentPage}`);

      const currentPageJobs = await parsePage({
        parsedJobsCount: dataObj.jobs.length,
        page,
      });

      dataObj.jobs.push(...currentPageJobs);

      eventBus.emit('update-task', {
        jobs: dataObj.jobs.length,
      });

      await page.evaluate((current) => {
        const currentPaginationItems = Array.from(
          document.querySelectorAll('ul.artdeco-pagination__pages li'),
        );

        const next = currentPaginationItems.find(
          (item) =>
            (item as HTMLLIElement)?.dataset.testPaginationPageBtn ===
            `${current + 1}`,
        ) as HTMLLIElement | undefined;

        if (next) {
          next.querySelector('button')?.click();
        } else {
          currentPaginationItems[currentPaginationItems.length - 2]
            ?.querySelector('button')
            ?.click(); // Should be 3 dots button
        }
      }, currentPage);

      await page.waitForTimeout(timeout);
    }

    dataObj.status = 'success';

    return dataObj;
  } catch (err) {
    log.error(`Failed to parse page ${url}`);
    log.error('Cannot get data from page', err);

    return { ...dataObj, status: 'failed' };
  }
};

export const scrapeCompanyJobs = async ({
  jobLocation,
  page,
  timeout,
  urls,
}: {
  jobLocation: string;
  page: Page;
  timeout: number;
  urls: string[];
}) => {
  try {
    let aborted = false;
    let abortReason = 'Something went wrong';

    page.on('response', (response) => {
      if (response.status() === 999 || response.status() === 429) {
        log.error(
          `Got ${response.status()} status code. LinkedIn session expired`,
        );
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
      `Company URL,Company Name,Job URL,Title,Description,Location,Posted At,Number of Applicants,Status\n`,
    );

    const completionTimes = [];

    for (const url of urls) {
      try {
        current++;

        log.info(`Starting scraping ${current} of ${urls.length}: `, url);

        eventBus.emit('update-task', {
          current,
        });

        const result = await pageHandler({
          jobLocation,
          page,
          timeout,
          url,
        });

        result.jobs.forEach((job) => {
          writeableStreamCsv.write(
            `${[
              result.url,
              job.companyName,
              job.url,
              job.title,
              job.description,
              job.location,
              job.whenPosted,
              job.numberOfApplicants,
              result.status,
            ]
              .map((r) => `"${r || ''}"`)
              .join(',')}\n`,
          );
        });

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
};
