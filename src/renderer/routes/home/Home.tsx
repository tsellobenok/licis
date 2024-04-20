import { useEffect, useState } from 'react';
import log from 'electron-log/renderer';
import {
  ActionIcon,
  Button,
  FileInput,
  Flex,
  NumberInput,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconPlugConnected, IconX } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';

import { parseCSV } from '../../utils/csv';
import { RESULTS_FILENAME, RESULTS_PATH } from '../../../const';

import { ScrapeFormValues, ScrapeTask } from '../../../types';

import { Form } from './Home.styles';

const TASK_STATUS_MESSAGE: Record<ScrapeTask['status'], string> = {
  'in-progress': 'in progress',
  completed: 'completed',
  failed: 'failed',
  partial: 'partially succeed',
};

export const Home = () => {
  const [task, setTask] = useState<ScrapeTask | null>(null);
  const [companyUrls, setCompanyUrls] = useState<string[] | null>(null);
  const { watch, handleSubmit, setValue } = useForm<ScrapeFormValues>({
    defaultValues: {
      file: null,
      liAt: '',
      timeout: 3,
    },
  });
  const values = watch();

  const restoreLiAtFromStorage = async () => {
    try {
      const config = await window.electron.ipcRenderer.invoke('get-config');

      setValue('liAt', config?.liAt);
    } catch (err) {
      log.error('Failed to get liAt from storage');
      log.error(err);
    }
  };

  const setLiAtToStorage = async (liAt: string) => {
    try {
      await window.electron.ipcRenderer.invoke('update-config', {
        liAt,
      });
    } catch (err) {
      log.error('Failed to set liAt to storage.');
      log.error(err);
    }
  };

  const parseFile = async (file: File) => {
    try {
      const result = await parseCSV(file as File);

      setCompanyUrls(result);

      log.info('Parsed file. Companies found: ', result?.length);
    } catch (err) {
      log.error('Failed to parse file');
      log.error(err);
    }
  };

  const onSubmit = async ({ liAt, timeout }: ScrapeFormValues) => {
    try {
      setTask({
        current: 0,
        failCount: 0,
        status: 'in-progress',
        successCount: 0,
        total: companyUrls?.length || 0,
      });

      await window.electron.ipcRenderer.invoke('scrape', {
        liAt,
        timeout,
        type: 'company-info',
        urls: companyUrls,
      });
    } catch (err) {
      log.error('Scrape task failed');
      log.error(err);
    }
  };

  const onDownload = async () => {
    try {
      log.info('Download invoked');

      await window.electron.ipcRenderer.invoke('download', {
        path: `${RESULTS_PATH}/${RESULTS_FILENAME}`,
      });
    } catch (err) {
      log.error('Download failed');
      log.error(err);
    }
  };

  const onLiConnect = async () => {
    try {
      const liAt = await window.electron.ipcRenderer.invoke('connect-linkedin');

      setValue('liAt', liAt);
    } catch (err) {
      log.error('LinkedIn connection failed');
      log.error(err);
    }
  };

  useEffect(() => {
    if (values.liAt) {
      setLiAtToStorage(values.liAt);
    }
  }, [values.liAt]);

  useEffect(() => {
    if (!values.file) {
      setCompanyUrls(null);
      setTask(null);

      return;
    }

    if (companyUrls) return;

    parseFile(values.file);
  }, [values.file]);

  useEffect(() => {
    restoreLiAtFromStorage();
  }, []);

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

  return (
    <Flex direction="column" gap="sm">
      {!task && (
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Flex direction="column" gap="xs">
            <FileInput
              accept="text/csv"
              description="File should contain one column with Linkedin company urls"
              label="Select CSV file"
              onChange={(file) => setValue('file', file)}
              placeholder="urls.csv"
              rightSection={
                values.file ? (
                  <ActionIcon
                    color="red"
                    onClick={() => setValue('file', null)}
                    size="xs"
                    variant="subtle"
                  >
                    <IconX />
                  </ActionIcon>
                ) : null
              }
              value={values.file}
            />
            {!!values.file && (
              <Text c="gray" size="sm">
                {companyUrls?.length || 0} company urls found
              </Text>
            )}
          </Flex>

          {!!values.file && (
            <>
              <Flex gap="sm" align="flex-end">
                <TextInput
                  description="Get it from cookies of linkedin"
                  label="LiAt"
                  onChange={(e) => setValue('liAt', e.target.value)}
                  placeholder="li_at"
                  value={values.liAt}
                  rightSection={
                    <Tooltip label="Connect LinkedIn">
                      <ActionIcon
                        c="gray"
                        variant="subtle"
                        onClick={onLiConnect}
                      >
                        <IconPlugConnected size="18" />
                      </ActionIcon>
                    </Tooltip>
                  }
                />
              </Flex>
              <NumberInput
                description="Delay between pages in seconds (3 is recommended)"
                label="Delay"
                min={1}
                onChange={(value) => setValue('timeout', Number(value) || 3)}
                value={values.timeout}
              />
            </>
          )}

          {!!values.file && !!companyUrls?.length && (
            <Button type="submit">Extract company info</Button>
          )}
        </Form>
      )}

      {!!task && (
        <Flex gap="xs" direction="column">
          <div>
            <Text size="xl">
              <strong>Task {TASK_STATUS_MESSAGE[task.status]}</strong>
            </Text>
            {task.failReason && (
              <Text c="red" size="xs">
                {task.failReason}
              </Text>
            )}
          </div>
          <div>
            <div>
              {task.status === 'in-progress' ? 'Scraping' : 'Scraped'}{' '}
              <strong>{task.current}</strong> of <strong>{task.total}</strong>{' '}
              companies
            </div>
            <Flex gap="xl">
              <Flex gap="xs" align="center">
                <Text size="sm" c="green">
                  Succeed:
                </Text>{' '}
                <Text size="sm">
                  <strong>{task.successCount}</strong>
                </Text>
              </Flex>
              <Flex gap="xs" align="center">
                <Text c="red" size="sm">
                  Failed:
                </Text>
                <Text size="sm">
                  <strong>{task.failCount}</strong>
                </Text>
              </Flex>
            </Flex>
          </div>
        </Flex>
      )}

      {!!task && task?.status !== 'in-progress' && (
        <Flex gap="sm">
          <Button onClick={() => setValue('file', null)} variant="outline">
            Start a new one
          </Button>

          <div>
            <Button onClick={onDownload}>Download results</Button>
          </div>
        </Flex>
      )}
    </Flex>
  );
};
