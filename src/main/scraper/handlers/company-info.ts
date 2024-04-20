import { Page } from 'puppeteer';
import log from 'electron-log';
import { countries } from '../../const/countries';

export const pageHandler = async (url: string, page: Page, timeout = 20000) => {
  const dataObj = {
    url,
    companyName: '',
    industry: '',
    location: '',
    size: '',
    website: '',
    specialties: '',
    revenue: '', // TODO: Add revenue
    openJobs: '', // TODO: Add jobs
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

    await page.waitForTimeout(timeout);

    dataObj.status = 'success';

    return dataObj;
  } catch (err) {
    log.error(`Failed to parse page ${url}`);
    log.error('Cannot get data from page', err);

    return { ...dataObj, status: 'failed' };
  }
};
