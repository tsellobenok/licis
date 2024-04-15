import { Page } from 'puppeteer';

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
      currentPageUrl.includes('unavailable') ||
      currentPageUrl.includes('/404')
    ) {
      return {
        ...dataObj,
        status: 'unavailable',
      };
    }

    // Wait for elements to load
    try {
      await page.waitForSelector('.break-words');
    } catch (e) {
      try {
        await page.waitForTimeout(3000);
        await page.reload();
        await page.waitForSelector('.break-words');
      } catch (e) {
        console.error(`Missing elements ${url}`);

        return {
          ...dataObj,
          status: 'missing-elements',
        };
      }
    }

    try {
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
            ? acc[latestDt] + '\n' + curr.innerText
            : curr.innerText;

          return acc;
        }, {});
      });

      dataObj.companyName = `${await page.evaluate(
        () =>
          document.querySelector('h1.org-top-card-summary__title')?.innerText,
      )}`;
      dataObj.tagLine =
        `${await page.evaluate(
          () =>
            document.querySelector('.org-top-card-summary__tagline')?.innerText,
        )}` || '';
      dataObj.website = valuesObj['Website'] || '';
      dataObj.industry = valuesObj['Industry'] || '';
      dataObj.location = valuesObj['Headquarters'] || '';
      dataObj.employees =
        valuesObj['Company size']
          ?.split('\n')[0]
          ?.split(' ')[0]
          ?.replace(/,/g, '') || '';
      dataObj.status = 'success';
    } catch (err) {
      console.error('Cannot get data from page', err);

      const error = new Error('CANNOT_GET_DATA_FROM_PAGE');

      error.description = err.message;
      error.additionalInfo = { url: await page.url() };

      throw error;
    }

    await page.waitForTimeout(timeout);

    return dataObj;
  } catch (err) {
    console.error(`Failed to parse page ${url}`);
    console.error(err);

    return { ...dataObj, status: 'failed' };
  }
};
