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
import { FileWithPath } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { IconPlugConnected, IconX } from '@tabler/icons-react';

import { parseCSV } from '../../utils/csv';
import { Form } from './Landing.styles';

interface FormValues {
  file: FileWithPath | null;
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
  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: {
      file: null,
      liAt: '',
      timeout: 3,
    },

    validate: {
      liAt: (value) =>
        value ? null : 'li_at cookie is required for authentication',
    },
  });
  const values = form.getValues();

  const getLiAtFromStorage = async () => {
    try {
      const liAt = await window.electron.ipcRenderer.invoke('get-li-at');

      form.setFieldValue('liAt', liAt);
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

  const parseFile = async (file: FileWithPath) => {
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
      urls: companyUrls,
      liAt,
      timeout,
    });
  };

  const onDownload = () => {
    window.electron.ipcRenderer.invoke('download', {
      path: './results/results.csv',
    });
  };

  const onLiConnect = async () => {
    const liAt = await window.electron.ipcRenderer.invoke('connect-linkedin');

    form.setFieldValue('liAt', liAt);
  };

  form.watch('liAt', ({ value }) => {
    if (value) {
      setLiAtToStorage(value);
    }
  });

  form.watch('file', ({ value }) => {
    if (!value) {
      setCompanyUrls(null);
      setTask(null);

      return;
    }

    if (companyUrls) return;

    parseFile(value);
  });

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
        <Form onSubmit={form.onSubmit(onSubmit)}>
          <FileInput
            accept="text/csv"
            placeholder="urls.csv"
            label="Select CSV file"
            description="File should contain one column with Linkedin company urls"
            {...form.getInputProps('file')}
          />

          {!!values.file && (
            <>
              <Flex gap="sm" align="flex-end">
                <TextInput
                  {...form.getInputProps('liAt')}
                  description="Get it from cookies of linkedin"
                  label="LiAt"
                  placeholder="li_at"
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
                defaultValue={3}
                label="Delay"
                description="Delay between pages in seconds (3 is recommended)"
                min={1}
                {...form.getInputProps('timeout')}
              />
              <Flex direction="column" gap="sm">
                <div>
                  <Flex align="center" gap="xs">
                    <div>
                      <strong>{values.file?.name}</strong> selected
                    </div>
                    <ActionIcon
                      onClick={() => form.setFieldValue('file', null)}
                      variant="subtle"
                      color="red"
                      size="xs"
                    >
                      <IconX />
                    </ActionIcon>
                  </Flex>
                  <Text c="gray" size="sm">
                    {companyUrls?.length} company urls found
                  </Text>
                </div>
              </Flex>
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
          <Button
            onClick={() => form.setFieldValue('file', null)}
            variant="outline"
          >
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
