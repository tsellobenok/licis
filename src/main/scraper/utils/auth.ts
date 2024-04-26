import { Page } from 'puppeteer';
import log from 'electron-log';

export const setAuthCookie = async (page: Page, liAt: string) => {
  await page.goto('https://linkedin.com');
  await page.setCookie({ name: 'li_at', value: liAt });
  log.info('Set li_at to page cookies: ', liAt);
};

const delay = (timeout: number) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(null), timeout * 1000);
  });

export const getLiAt = async (page: Page): Promise<string> => {
  await page.goto('https://linkedin.com');

  let liAt;

  while (true) {
    const cookies = await page.cookies();

    liAt = cookies.find((cookie) => cookie.name === 'li_at')?.value;

    if (liAt) {
      break;
    }

    await delay(1);
  }

  return liAt || '';
};
