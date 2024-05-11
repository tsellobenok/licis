import { ActionIcon, Text } from '@mantine/core';
import { IconBug } from '@tabler/icons-react';
import log from 'electron-log/renderer';

import packageJson from '../../../../../../release/app/package.json';

import { Bug } from './Debug.styles';

export const Debug = () => {
  const getLogs = async () => {
    try {
      log.info('Logs download invoked');

      await window.electron.ipcRenderer.invoke('download', {
        path: `./main.log`,
        fileName: 'main.log',
      });
    } catch (err) {
      log.error('Download failed');
      log.error(err);
    }
  };

  return (
    <Bug>
      <Text size="sm" c="gray">
        {packageJson.version}
      </Text>
      <ActionIcon onClick={getLogs} variant="subtle" c="red">
        <IconBug />
      </ActionIcon>
    </Bug>
  );
};
