import { Page } from 'puppeteer';
import log from 'electron-log';

export const pageHandler = async (url: string, page: Page, timeout = 20000) => {
  const dataObj = {
    url,
    companyName: '',
    website: '',
    employees: '',
    industry: '',
    location: '',
    tagLine: '',
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
        if (curr.nodeName === 'DT') {
          acc[curr.innerText] = null;
          latestDt = curr.innerText;
          return acc;
        }

        acc[latestDt] = acc[latestDt]
          ? `${acc[latestDt]}\n${curr.innerText}`
          : curr.innerText;

        return acc;
      }, {});
    });

    dataObj.companyName = `${await page.evaluate(
      () => document.querySelector('h1.org-top-card-summary__title')?.innerText,
    )}`;
    dataObj.tagLine =
      `${await page.evaluate(
        () =>
          document.querySelector('.org-top-card-summary__tagline')?.innerText,
      )}` || '';
    dataObj.website = valuesObj.Website || '';
    dataObj.industry = valuesObj.Industry || '';
    dataObj.location = valuesObj.Headquarters || '';
    dataObj.employees =
      valuesObj['Company size']
        ?.split('\n')[0]
        ?.split(' ')[0]
        ?.replace(/,/g, '') || '';
    dataObj.status = 'success';

    await page.waitForTimeout(timeout);

    return dataObj;
  } catch (err) {
    log.error(`Failed to parse page ${url}`);
    log.error('Cannot get data from page', err);

    return { ...dataObj, status: 'failed' };
  }
};
