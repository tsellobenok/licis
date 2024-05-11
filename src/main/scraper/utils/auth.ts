import { Page } from 'puppeteer';
import log from 'electron-log';

import { AccountCredentials } from '../../../types';

export const setAuthCookie = async (page: Page, liAt: string) => {
  await page.goto('https://linkedin.com');
  await page.setCookie({ name: 'li_at', value: liAt });
  log.info('Set li_at to page cookies: ', liAt);
};

export const getAccountMeta = async (
  page: Page,
  creds: AccountCredentials,
): Promise<{ name: string; avatar: string; liAt: string }> => {
  await page.goto(
    'https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin',
  );

  await page.waitForTimeout(300);

  await page.type('#username', creds?.email || '');
  await page.type('#password', creds?.password || '');
  await page.waitForTimeout(400);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.feed-identity-module__actor-meta');

  const cookies = await page.cookies();

  const liAt = cookies.find((cookie) => cookie.name === 'li_at')?.value || '';

  const { name, avatar } = await page.evaluate(() => {
    const avatarSrc = (
      document.querySelector(
        '.feed-identity-module__actor-meta img',
      ) as HTMLImageElement
    )?.src;
    const fullName = (
      document.querySelector(
        '.feed-identity-module__actor-meta a',
      ) as HTMLLinkElement
    )?.innerText;

    return { name: fullName, avatar: avatarSrc };
  });

  return { liAt, name, avatar };
};
