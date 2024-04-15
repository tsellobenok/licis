import { Browser, HTTPResponse, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { setAuthCookie } from './utils/auth';
import { eventBus } from './utils/event-bus';

puppeteer.use(StealthPlugin());

export const startBrowser = async (
  headless = true,
): Promise<{
  browser: Browser | undefined;
  page: Page | undefined;
}> => {
  const browser = await puppeteer.launch({
    headless,
    args: [
      '--no-sandbox',
      `--window-size=${1366},${768}`
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
    throw new Error('Browser was not initialized');
  }

  return { browser, page };
};

export const startBrowserAndLogin = async (liAt: string) => {
  const { browser, page } = await startBrowser();

  const stopBrowser = () => {
    browser?.close();
  };

  const onPageResponse = async (response: HTTPResponse) => {
    if (
      response.url().includes('linkedin.com/authwall') ||
      response.status() === 429
    ) {
      eventBus.emit('cancel', { message: 'LinkedIn re-login is required' });
    }
  };

  page?.on('response', onPageResponse);

  await setAuthCookie(page, liAt);

  return { stopBrowser, browser, page };
};
