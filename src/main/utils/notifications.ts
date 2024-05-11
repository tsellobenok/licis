import { Notification } from 'electron';

export const showNotification = (data: { title: string; body: string }) => {
  new Notification({
    title: data.title,
    body: data.body || '',
  }).show();
};
