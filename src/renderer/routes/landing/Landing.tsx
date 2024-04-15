import { useCallback, useEffect, useState } from 'react';
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
import { Form } from './Landing.styles';

interface FormValues {
  file: File | null;
  liAt: string;
  timeout: number;
}

interface Task {
  current: number;
  failCount: number;
  status: 'in-progress' | 'completed' | 'failed';
  successCount: number;
  total: number;
}

export const Landing = () => {
  const [task, setTask] = useState<Task | null>(null);
  const [companyUrls, setCompanyUrls] = useState<string[] | null>(null);
  const { watch, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      file: null,
      liAt: '',
      timeout: 3,
    },
  });
  const values = watch();

  const getLiAtFromStorage = async () => {
    try {
      const liAt = await window.electron.ipcRenderer.invoke('get-li-at');

      setValue('liAt', liAt);
    } catch (err) {
      console.error(err);
    }
  };

  const setLiAtToStorage = async (liAt: string) => {
    try {
      await window.electron.ipcRenderer.invoke('set-li-at', {
        liAt,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const parseFile = async (file: File) => {
    setCompanyUrls(await parseCSV(file as File));
  };

  const onSubmit = async ({ liAt, timeout }: FormValues) => {
    setTask({
      current: 0,
      failCount: 0,
      status: 'in-progress',
      successCount: 0,
      total: companyUrls?.length || 0,
    });

    await window.electron.ipcRenderer.invoke('extract-company-info', {
      liAt,
      timeout,
      urls: companyUrls,
    });
  };

  const onDownload = () => {
    window.electron.ipcRenderer.invoke('download', {
      path: './results/results.csv',
    });
  };

  const onLiConnect = async () => {
    const liAt = await window.electron.ipcRenderer.invoke('connect-linkedin');

    setValue('liAt', liAt);
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

    console.log('parse', values.file);

    parseFile(values.file);
  }, [values.file]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'update',
      (data: Partial<Task>) => {
        setTask((current) => ({ ...(current || {}), ...data }));
      },
    );

    getLiAtFromStorage();

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
                onChange={(value) => setValue('timeout', value)}
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
        <div>
          <Text size="xl">
            <strong>Task {task.status}</strong>
          </Text>
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
      )}

      <Flex gap="sm">
        {(task?.status === 'completed' || task?.status === 'failed') && (
          <Button onClick={() => setValue('file', null)} variant="outline">
            Start a new one
          </Button>
        )}

        {task?.status === 'completed' && (
          <div>
            <Button onClick={onDownload}>Download results</Button>
          </div>
        )}
      </Flex>
    </Flex>
  );
};
