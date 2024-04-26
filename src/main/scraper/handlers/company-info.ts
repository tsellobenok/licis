import { Page } from 'puppeteer';
import log from 'electron-log';
import { countries } from '../../const/countries';
import { eventBus } from '../../event-bus';
import { createWriteStream } from '../../utils/files';
import { RESULTS_FILENAME, RESULTS_PATH } from '../../../const';
import { getTaskStatus } from '../utils/tasks';

const pageHandler = async ({
  getLocations,
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
    industry: '',
    location: '',
    size: '',
    website: '',
    specialties: '',
    recentFounding: '',
    employees: '',
    peoplePerLocation: '',
    status: '',
  };

  try {
    const aboutPage = `${url.replace(/\/$/, '')}/about`;

    await page.goto(aboutPage);
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
      await page.waitForSelector('.break-words', { timeout: 5000 });
    } catch (err) {
      log.error(`Can't find required .break-words element on the page ${url}`);
      log.error(err);

      return {
        ...dataObj,
        status: 'failed',
      };
    }

    const valuesObj = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelector('.artdeco-card dl')?.children || [],
      );

      let latestDt = '';

      return elements.reduce((acc: Record<string, string | null>, curr) => {
        const currentEl = curr as HTMLElement;

        if (currentEl.nodeName === 'DT') {
          acc[currentEl.innerText] = null;
          latestDt = currentEl.innerText;
          return acc;
        }

        acc[latestDt] = acc[latestDt]
          ? `${acc[latestDt]}\n${currentEl.innerText}`
          : currentEl.innerText;

        return acc;
      }, {});
    });

    dataObj.companyName = `${await page.evaluate(
      () =>
        (
          document.querySelector(
            'h1.org-top-card-summary__title',
          ) as HTMLHeadingElement
        )?.innerText,
    )}`;
    dataObj.website = valuesObj.Website || '';
    dataObj.industry = valuesObj.Industry || '';
    dataObj.location = valuesObj.Headquarters || '';
    dataObj.specialties = valuesObj.Specialties || '';
    dataObj.size =
      valuesObj['Company size']
        ?.split('\n')[0]
        ?.split(' ')[0]
        ?.replace(/,/g, '') || '';
    dataObj.employees =
      valuesObj['Company size']
        ?.split('\n')[1]
        ?.split(' ')[0]
        ?.replace(/,/g, '') || '';

    if (getLocations) {
      await page.evaluate(
        () =>
          (
            Array.from(
              document.querySelectorAll('li.org-page-navigation__item a') || [],
            ).find(
              (el) => (el as HTMLLinkElement).innerText === 'People',
            ) as HTMLLinkElement
          )?.click(),
      );

      await page.waitForSelector('button.org-people-bar-graph-element', {
        timeout: 15000,
      });

      const peopleRows = await page.evaluate(() =>
        (
          document.querySelector('.artdeco-carousel__item') as HTMLDivElement
        )?.innerText?.includes('Where they live')
          ? Array.from(
              document
                .querySelector('.artdeco-carousel__item')
                ?.querySelectorAll('button.org-people-bar-graph-element') || [],
            )
              .map(
                (el) =>
                  (el as HTMLButtonElement).innerText?.replace(
                    '\ntoggle off',
                    '',
                  ),
              )
              .filter((i) => !!i)
          : [],
      );

      dataObj.peoplePerLocation = peopleRows
        .filter((i) => {
          const [_, ...rest] = i.split(' ');
          const country = rest.join(' ');

          return countries.find((c) => c.name === country);
        })
        .map((i) => i.replace(',', ''))
        .join('\n');
    } else {
      dataObj.peoplePerLocation = '';
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

export const scrapeCompanyInfo = async ({
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
      `URL,Name,Industry,Location,Size,Website,Specialties,Employees,People per location,Status\n`,
    );

    let completionTimes = [];

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

        eventBus.emit('end-time-update', {
          endTime:
            (completionTimes.reduce((acc, curr) => acc + curr, 0) /
              completionTimes.length) * // average completion time
              (urls.length - current) +
            Date.now(), // urls left
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
