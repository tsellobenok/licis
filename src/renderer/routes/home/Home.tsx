import { useEffect, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { formatDistance } from 'date-fns';
import log from 'electron-log/renderer';
import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  FileInput,
  Flex,
  NumberInput,
  SegmentedControl,
  Select,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconBug, IconPlugConnected, IconX } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';

import packageJson from '../../../../release/app/package.json';
import { parseCSV } from '../../utils/csv';
import { RESULTS_FILENAME, RESULTS_PATH } from '../../../const';

import { ScrapeFormValues, ScrapeTask } from '../../../types';

import { Bug, Form } from './Home.styles';
import { useCurrentTime } from './hooks';

const TASK_STATUS_MESSAGE: Record<ScrapeTask['status'], string> = {
  'in-progress': 'in progress',
  completed: 'completed',
  failed: 'failed',
  partial: 'partially succeed',
};

const schema = yup
  .object({
    file: yup.mixed().required('You have to select a file'),
    liAt: yup.string().required('You have to to connect LinkedIn'),
  })
  .required();

export const Home = () => {
  const [endTime, setEndTime] = useState<number | null>(0);
  const [task, setTask] = useState<ScrapeTask | null>(null);
  const [companyUrls, setCompanyUrls] = useState<string[] | null>(null);
  const currentTime = useCurrentTime();
  const { watch, formState, handleSubmit, setValue } =
    useForm<ScrapeFormValues>({
      defaultValues: {
        file: null,
        getLocations: true,
        jobLocation: '',
        liAt: '',
        timeout: 3,
        type: 'company-info',
      },
      resolver: yupResolver(schema) as any,
    });
  const values = watch();

  const restoreDefaultsFromStorage = async () => {
    try {
      const config = await window.electron.ipcRenderer.invoke('get-config');

      setValue('liAt', config?.liAt);
      setValue('jobLocation', config?.jobLocation || 'Worldwide');
    } catch (err) {
      log.error('Failed to get config from storage');
      log.error(err);
    }
  };

  const setConfigToStorage = async (formValues: ScrapeFormValues) => {
    try {
      await window.electron.ipcRenderer.invoke('update-config', {
        ...(formValues.liAt && { liAt: formValues.liAt }),
        ...(formValues.jobLocation && { jobLocation: formValues.jobLocation }),
      });
    } catch (err) {
      log.error('Failed to set config to storage.');
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

  const onSubmit = async (formValues: ScrapeFormValues) => {
    try {
      setTask({
        current: 0,
        failCount: 0,
        status: 'in-progress',
        successCount: 0,
        total: companyUrls?.length || 0,
      });

      const { file, ...rest } = formValues;

      await window.electron.ipcRenderer.invoke('scrape', {
        ...rest,
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

  const getLogs = async () => {
    try {
      log.info('Download invoked');

      await window.electron.ipcRenderer.invoke('download', {
        path: `./main.log`,
        fileName: 'main.log',
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

  const getTimeText = () => {
    if (task?.status !== 'in-progress') {
      return '';
    }

    if (!endTime) {
      return ' (estimating time left...)';
    }

    return ` (${formatDistance(currentTime, endTime, {
      includeSeconds: true,
    })} left)`;
  };

  useEffect(() => {
    setConfigToStorage(values);
  }, [values.liAt, values.jobLocation]);

  useEffect(() => {
    if (!values.file) {
      setCompanyUrls(null);
      setTask(null);
      setEndTime(0);

      return;
    }

    if (companyUrls) return;

    parseFile(values.file);
  }, [values.file]);

  useEffect(() => {
    restoreDefaultsFromStorage();
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

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'end-time-update',
      (data: { endTime: number }) => {
        setEndTime(data.endTime);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Flex direction="column" gap="sm">
      <Bug>
        <Text size="sm" c="gray">
          {packageJson.version}
        </Text>
        <ActionIcon onClick={getLogs} variant="subtle" c="red">
          <IconBug />
        </ActionIcon>
      </Bug>

      {!task && (
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Flex direction="column" gap="xs">
            <SegmentedControl
              data={[
                { value: 'company-info', label: 'Company Info' },
                { value: 'company-jobs', label: 'Company Jobs' },
              ]}
              onChange={(value) => setValue('type', value)}
              value={values.type}
            />

            <FileInput
              accept="text/csv"
              description="File should contain one column with Linkedin company urls"
              error={formState.errors.file?.message}
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

          <>
            <Flex gap="sm" align="flex-end">
              <TextInput
                description="Click on connect icon or get it from LinkedIn cookies manually"
                error={formState.errors.liAt?.message}
                label="LiAt"
                onChange={(e) => setValue('liAt', e.target.value)}
                placeholder="li_at"
                value={values.liAt}
                rightSection={
                  <Tooltip label="Connect LinkedIn">
                    <ActionIcon c="gray" variant="subtle" onClick={onLiConnect}>
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

            {values.type === 'company-info' && (
              <Checkbox
                checked={values.getLocations}
                description="Collect all countries with amount of employees from People tab"
                label="Get people per location"
                onChange={(e) => setValue('getLocations', e.target.checked)}
              />
            )}

            {values.type === 'company-jobs' && (
              <TextInput
                description={
                  'Must be equal to the location on LinkedIn job page. Type "Worldwide" to get all'
                }
                label="Job location"
                onChange={(e) => setValue('jobLocation', e.target.value)}
                value={values.jobLocation}
              />
            )}
          </>

          <Button type="submit">
            Extract{' '}
            {values.type === 'company-info' ? 'company info' : 'company jobs'}
          </Button>
        </Form>
      )}

      {!!task && (
        <Flex gap="xs" direction="column">
          <div>
            <Text size="xl">
              <strong>Task {TASK_STATUS_MESSAGE[task.status]}</strong>
              {getTimeText()}
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
              {values.type === 'company-jobs' && (
                <>
                  . Got <strong>{task.jobs || 0}</strong> jobs
                </>
              )}
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
