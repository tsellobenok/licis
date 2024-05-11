import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'update-task' | 'config-updated';
export type Handlers =
  | 'check-and-get-config'
  | 'connect-linkedin'
  | 'download'
  | 'get-config'
  | 'open-in-browser'
  | 'scrape'
  | 'update-config';

const electronHandler = {
  ipcRenderer: {
    invoke(handler: Handlers, ...args: unknown[]) {
      return ipcRenderer.invoke(handler, ...args);
    },
    on(channel: Channels, func: (...args: any[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
