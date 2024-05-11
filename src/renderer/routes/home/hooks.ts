import { useEffect, useState } from 'react';
import log from 'electron-log';
import { formatDistance } from 'date-fns';
import { nanoid } from 'nanoid';

import { parseCSV } from '../../utils/csv';

import {
  AppConfig,
  ScrapeTask,
  TaskStatus,
  ScrapeTaskType,
} from '../../../types';

export const useCurrentTime = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return time;
};

export const useTimeLeft = (task: ScrapeTask) => {
  const currentTime = useCurrentTime();

  if (
    task?.status !== TaskStatus.InProgress ||
    task?.type === ScrapeTaskType.CompanyInfo
  ) {
    return '';
  }

  if (!task?.endTime) {
    return ' (estimating time left...)';
  }

  return ` (${formatDistance(currentTime, task?.endTime, {
    includeSeconds: true,
  })} left)`;
};

export const useParsedRows = (file: File | null) => {
  const [rows, setRows] = useState<string[]>([]);

  const parseRows = async (fileToParse: File) => {
    try {
      if (fileToParse) {
        setRows(await parseCSV(fileToParse));
      } else {
        setRows([]);
      }
    } catch (err) {
      log.error('Failed to parse CSV file. ', err);
      setRows([]);
    }
  };

  useEffect(() => {
    if (file) {
      parseRows(file);
    } else {
      setRows([]);
    }
  }, [file]);

  return rows;
};

export const useTask = () => {
  const [task, setTask] = useState<ScrapeTask | null>(null);

  const clearTask = () => setTask(null);

  const createTask = async ({ rows, ...formValues }) => {
    try {
      setTask({
        current: 0,
        endTime: null,
        failCount: 0,
        id: nanoid(),
        status: TaskStatus.InProgress,
        successCount: 0,
        total: rows?.length || 0,
        type: formValues.type,
      });

      const { file, ...rest } = formValues;

      await window.electron.ipcRenderer.invoke('scrape', {
        ...rest,
        urls: rows,
      });
    } catch (err) {
      log.error('Scrape task failed');
      log.error(err);
    }
  };

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'update-task',
      (data: Partial<ScrapeTask>) => {
        setTask((current) => ({ ...(current || {}), ...data }) as ScrapeTask);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return { task, createTask, clearTask };
};

export const useConfig = () => {
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const checkLiAndGetConfig = async () => {
    setIsConfigLoading(true);

    try {
      setConfig(await window.electron.ipcRenderer.invoke('check-and-get-config'));
    } catch (err) {
      log.error('Failed to check LinkedIn connectivity:');
      log.error(err);
    }

    setIsConfigLoading(false);
  };

  const updateConfig = async (configValues: AppConfig) => {
    try {
      await window.electron.ipcRenderer.invoke(
        'update-config',
        JSON.stringify(configValues),
      );
    } catch (err) {
      log.error('Failed to set config to storage.');
      log.error(err);
    }
  };

  useEffect(() => {
    checkLiAndGetConfig();
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'config-updated',
      (configValues: AppConfig) => {
        setConfig(configValues);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return { config, isConfigLoading, updateConfig };
};
