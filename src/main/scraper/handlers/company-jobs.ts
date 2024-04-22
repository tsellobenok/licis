import { Page } from 'puppeteer';
import log from 'electron-log';
import { eventBus } from '../../event-bus';
import { createWriteStream } from '../../util';
import { RESULTS_FILENAME, RESULTS_PATH } from '../../../const';
import { getTaskStatus } from '../utils/tasks';

const parsePage = async ({ page }: { page: Page }) => {
  const jobsList = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('ul.scaffold-layout__list-container li'),
    ),
  );

  const jobs = [];

  for (let i = 0; i < jobsList.length; i++) {
    await page.click(
      `ul.scaffold-layout__list-container li:nth-child(${i + 1})`,
    );
    await page.waitForTimeout(1000);

    const results = await page.evaluate((i) => {
      const el = document.querySelector(
        'ul.scaffold-layout__list-container li:nth-child(' + (i + 1) + ')',
      );

      const url = (el.querySelector('a') as HTMLAnchorElement)?.href;
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
      const description = document.querySelector(
        '.jobs-description-content__text',
      );

      return {
        url,
        companyName,
        title,
        description,
        location,
        whenPosted,
        numberOfApplicants,
      };
    }, i);

    jobs.push(results);
  }

  return jobs;
};

const pageHandler = async ({
  page,
  timeout = 20000,
  url,
}: {
  getLocations: boolean;
  page: Page;
  timeout: number;
  url: string;
}) => {
  const dataObj = {
    url,
    companyName: '',
    employees: '',
    location: '',
    postedAt: '',
    skills: '',
    title: '',
    description: '',
    status: 'in-progress',
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

    await page.goto(
      'https://www.linkedin.com/jobs/search/?currentJobId=3864817543&f_C=1441%2C10434300%2C10437069%2C28658883%2C8276%2C99942982%2C15154437%2C202869%2C11448%2C1354499%2C1363825%2C1586%2C165158%2C4972%2C76987811%2C7846%2C86157465&geoId=92000000&keywords=google&location=Worldwide&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true&sortBy=R',
    );

    // Wait for elements to load
    // try {
    //   await page.waitForSelector('.org-jobs-job-search-form-module__headline', {
    //     timeout: 5000,
    //   });
    // } catch (err) {
    //   log.error(`Can't find required headline element on the page ${url}`);
    //   log.error(err);
    //
    //   return {
    //     ...dataObj,
    //     status: 'failed',
    //   };
    // }

    // await page.evaluate(
    //   () =>
    //     (
    //       document.querySelector(
    //         '.org-jobs-recently-posted-jobs-module__show-all-jobs-btn a',
    //       ) as HTMLAnchorElement
    //     )?.click(),
    // );

    await page.waitForSelector('ul.scaffold-layout__list-container');

    const allJobs = [];

    const pageJobs = await parsePage({ page });

    allJobs.push(...pageJobs);

    const paginationItems = await page.evaluate(() =>
      Array.from(document.querySelectorAll('ul.artdeco-pagination__pages li')),
    );

    if (paginationItems.length) {
      const totalPages =
        Number(
          (paginationItems[paginationItems.length - 1] as HTMLLIElement).dataset
            .testPaginationPageBtn,
        ) || 0;

      for (let currentPage = 1; currentPage < totalPages; currentPage++) {
        const currentPageJobs = await parsePage({ page });

        allJobs.push(...currentPageJobs);

        const currentPaginationItems = await page.evaluate(() =>
          Array.from(
            document.querySelectorAll('ul.artdeco-pagination__pages li'),
          ),
        );
        const next = currentPaginationItems.find(
          (item) =>
            item.dataset?.testPaginationPageBtn === `${currentPage + 1}`,
        );

        if (next) {
          next.click();
        } else {
          paginationItems[paginationItems.length - 2].click(); // Should be 3 dots button
        }

        await page.waitForTimeout(1000);
      }
    }

    await page.waitForTimeout(timeout);

    dataObj.status = 'success';

    return dataObj;
  } catch (err) {
    log.error(`Failed to parse page ${url}`);
    log.error('Cannot get data from page', err);

    return { ...dataObj, status: 'failed' };
  }
};

export const scrapeCompanyJobs = async ({
  getLocations,
  page,
  timeout,
  urls,
}: {
  getLocations: boolean;
  page: Page;
  timeout: number;
  urls: string[];
}) => {
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
      `URL,Name,Industry,Location,Size,Website,Specialties,Open Jobs,Employees,People per location,Status\n`,
    );

    let completionTimes = [];
    let timeLeft = 0;

    for (const url of urls) {
      try {
        const startTime = new Date().getTime();

        current++;

        log.info(`Starting scraping ${current} of ${urls.length}: `, url);

        eventBus.emit('update-task', {
          current,
        });

        const result = await pageHandler({
          getLocations,
          page,
          timeout,
          url,
        });

        const endTime = new Date().getTime();

        completionTimes.push(endTime - startTime);

        eventBus.emit('time-left-update', {
          timeLeft:
            (completionTimes.reduce((acc, curr) => acc + curr, 0) /
              completionTimes.length) * // average completion time
            (urls.length - current), // urls left
        });

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
};
