import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import log from 'electron-log';

import { setAuthCookie } from './utils/auth';
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../../const';

puppeteer.use(StealthPlugin());

export const startBrowser = async (
  headless = true,
): Promise<{
  browser: Browser;
  page: Page;
}> => {
  log.info('Starting browser...');

  const browser = await puppeteer.launch({
    headless: false,
    // headless: headless ? 'new' : false, TODO
    args: [
      '--no-sandbox',
      `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
      // '--disable-setuid-sandbox',
      // '--disable-infobars',
      // '--window-position=0,0',
      // '--ignore-certifcate-errors',
      // '--ignore-certifcate-errors-spki-list',
      // '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"'
    ],
    ignoreHTTPSErrors: true,
  });
  const page = await browser?.newPage();

  if (!browser || !page) {
    browser?.close();
    throw new Error('Browser was not initialized');
  }

  log.info('Browser started successfully');

  return { browser, page };
};

export const startBrowserAndLogin = async (liAt: string) => {
  const { browser, page } = await startBrowser();

  const stopBrowser = () => {
    browser?.close();
    log.info('Browser stopped');
  };

  await setAuthCookie(page, liAt);

  return { stopBrowser, browser, page };
};
