import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import log from 'electron-log';

import { setAuthCookie } from './utils/auth';
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../../const';
import { getChromeExecutablePath } from '../utils/files';
import { eventBus } from '../event-bus';

puppeteer.use(StealthPlugin());

export const startBrowser = async (
  showBrowser = false,
): Promise<{
  browser: Browser;
  page: Page;
}> => {
  log.info('Starting browser...');

  const browser = await puppeteer.launch({
    headless: !showBrowser,
    executablePath: getChromeExecutablePath(),
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
    ignoreDefaultArgs: ['--disable-extensions'],
    ignoreHTTPSErrors: true,
  });
  const page = await browser?.newPage();

  page.setViewport({ width: WINDOW_WIDTH, height: WINDOW_HEIGHT });

  if (!browser || !page) {
    browser?.close();
    throw new Error('Browser was not initialized');
  }

  const stopBrowser = () => {
    browser?.close();
  };

  eventBus.once('stop-browser', stopBrowser);

  browser.once('disconnected', () => {
    eventBus.off('stop-browser', stopBrowser);
  });

  log.info('Browser started successfully');

  return { browser, page };
};

export const startBrowserAndLogin = async (
  liAt: string,
  showBrowser?: boolean,
) => {
  const { browser, page } = await startBrowser(showBrowser);

  await setAuthCookie(page, liAt);

  return { browser, page };
};
