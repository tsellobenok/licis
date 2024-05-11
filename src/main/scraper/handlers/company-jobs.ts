import { Page } from 'puppeteer';
import log from 'electron-log';

import { RESULTS_FILENAME, RESULTS_PATH } from '../../../const';
import { createWriteStream } from '../../utils/files';
import { getConfig, updateConfig } from '../../utils/config';
import { getTaskStatus } from '../utils/tasks';
import { syncTask } from '../../utils/renderer-communication';

import { Account, JobResult, TaskStatus } from '../../../types';

interface PageHandlerResult {
  jobs: JobResult[];
  status: TaskStatus;
  url: string;
}

let parsedJobsCount = 0;

const parsePage = async ({ page }: { page: Page }): Promise<JobResult[]> => {
  const noJobs = await page.evaluate(
    () =>
      (
        document.querySelector(
          'header.scaffold-layout__list-header',
        ) as HTMLDivElement
      )?.innerText?.includes('Jobs you may be interested in'),
  );

  if (noJobs) {
    return [];
  }

  const jobsList = (await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('ul.scaffold-layout__list-container > li'),
    ),
  )) as HTMLLIElement[];
  const jobs = [];

  for (let currentJob = 1; currentJob <= jobsList.length; currentJob++) {
    await page.click(
      `ul.scaffold-layout__list-container > li:nth-child(${currentJob})`,
    );
    await page.waitForTimeout(1000 + Math.round(Math.random() * 1000));

    const result: JobResult = await page.evaluate((current) => {
      const el = document.querySelector(
        `ul.scaffold-layout__list-container > li:nth-child(${current})`,
      );

      const isTertiary = !!document.querySelector(
        '.job-details-jobs-unified-top-card__tertiary-description',
      );

      if (isTertiary) {
        const url = (
          (el as HTMLElement).querySelector('a') as HTMLAnchorElement
        )?.href;
        const title = (
          document.querySelector(
            '.job-details-jobs-unified-top-card__job-title',
          ) as HTMLAnchorElement
        )?.innerText;
        const companyName = (
          document.querySelector(
            '.job-view-layout .job-details-jobs-unified-top-card__company-name',
          ) as HTMLDivElement
        )?.innerText;

        const [location, whenPosted, numberOfApplicants] = Array.from(
          document.querySelectorAll('.job-view-layout .tvm__text'),
        )
          .map((i) => (i as HTMLSpanElement).innerText)
          .filter((i) => i !== ' · ');

        const description = (
          document.querySelector(
            '.jobs-description-content__text',
          ) as HTMLElement
        )?.innerText;

        return {
          url,
          companyName,
          title,
          description,
          location,
          whenPosted,
          numberOfApplicants: numberOfApplicants?.replace(
            / applicant(s?)/g,
            '',
          ),
        };
      }

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
          ) as HTMLElement
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
        numberOfApplicants: numberOfApplicants?.replace(/ applicant(s?)/g, ''),
      };
    }, currentJob);

    jobs.push(result);

    parsedJobsCount++;

    syncTask({
      jobs: parsedJobsCount,
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
}): Promise<PageHandlerResult> => {
  const dataObj: PageHandlerResult = {
    jobs: [],
    status: TaskStatus.InProgress,
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
        status: TaskStatus.Failed,
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
        status: TaskStatus.Failed,
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
      log.info(`Started scraping job page #${currentPage}`);

      const currentPageJobs = await parsePage({
        page,
      });

      dataObj.jobs.push(...currentPageJobs);

      await page.mouse.move(
        Math.round(Math.random() * 1300),
        Math.round(Math.random() * 700),
      );

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

    dataObj.status = TaskStatus.Completed;

    return dataObj;
  } catch (err) {
    log.error(`Failed to parse page ${url}`);
    log.error('Cannot get data from page', err);

    return { ...dataObj, status: TaskStatus.Failed };
  }
};

export const scrapeCompanyJobs = async ({
  jobLocation,
  page,
  timeout,
  urls,
}: {
  jobLocation?: string;
  page: Page;
  timeout: number;
  urls: string[];
}) => {
  try {
    let aborted = false;
    let abortReason = 'Something went wrong';

    parsedJobsCount = 0;

    page.on('response', (response) => {
      if (response.status() === 999 || response.status() === 429) {
        log.error(
          `Got ${response.status()} status code. LinkedIn session expired`,
        );
        aborted = true;
        abortReason = 'LinkedIn session expired. Reconnect it, please';

        const { accounts } = getConfig();

        updateConfig({
          accounts:
            accounts?.map((acc: Account) =>
              acc.selected
                ? {
                    ...acc,
                    liAt: null,
                  }
                : acc,
            ) || [],
        });
      }
    });

    syncTask({
      current: 0,
      status: TaskStatus.InProgress,
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

    for (const url of urls) {
      try {
        current++;

        log.info(`Starting scraping ${current} of ${urls.length}: `, url);

        syncTask({ current });

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
              .map((r) => `"${(r || '').replace(/"/g, '""')}"`)
              .join(',')}\n`,
          );
        });

        if (result && result?.status !== TaskStatus.Failed) {
          successCount++;
          log.info(`Scraped ${current} of ${urls.length}: `, url);
        } else {
          failCount++;
          log.info(`Failed to scrape ${current} of ${urls.length}: `, url);
        }

        syncTask({
          successCount,
          failCount,
        });
      } catch (err) {
        log.error(`Error at ${current} of ${urls.length}: `, url);
        log.error(err);

        failCount++;

        syncTask({
          failCount,
        });
      }

      if (aborted) {
        throw new Error(abortReason);
      }
    }

    syncTask({
      status: getTaskStatus({ successCount, total: urls.length }),
    });
  } catch (err) {
    const { message } = err as Error;

    syncTask({
      status: TaskStatus.Failed,
      failReason: message,
    });

    log.error('Error while scraping', message);
  }
};
