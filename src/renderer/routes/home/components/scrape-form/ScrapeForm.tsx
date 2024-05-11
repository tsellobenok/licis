import {
  ActionIcon,
  Button,
  FileInput,
  Flex,
  NumberInput,
  Select,
  Title,
} from '@mantine/core';
import isEqual from 'lodash/isEqual';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { IconX } from '@tabler/icons-react';

import { useParsedRows } from '../../hooks';
import { appStateAtom } from '../../state';

import { ScrapeTaskType } from '../../../../../types';

import { Wrapper } from './ScrapeForm.styles';

interface ScrapeOptionsForm {
  file: File | null;
  type: 'company-info' | 'company-jobs';
  timeout: number;
}

interface Props {
  createTask: (data: ScrapeOptionsForm & { rows: string[] }) => void;
}

const schema = yup.object({
  file: yup.mixed().required('You have to select a file'),
});

export const ScrapeForm = ({ createTask }: Props) => {
  const { handleSubmit, setValue, watch, formState } =
    useForm<ScrapeOptionsForm>({
      defaultValues: {
        file: null,
        timeout: 3,
        type: 'company-info',
      },
      resolver: yupResolver(schema) as any,
    });
  const values = watch();
  const rows = useParsedRows(values.file);
  const [_, setAppState] = useRecoilState(appStateAtom);

  const onSubmit = async (formValues: ScrapeOptionsForm) => {
    await createTask({ ...formValues, rows });
  };

  useEffect(() => {
    setAppState((prev) => {
      if (isEqual(prev, values)) {
        return prev;
      }

      return { ...prev, ...values };
    });
  }, [values]);

  return (
    <Wrapper>
      <Title order={3}>Scrape options</Title>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex align="start" direction="column" gap="md" justify="start" mt="16">
          <Flex direction="column" gap="4">
            <FileInput
              accept="text/csv"
              description="File should contain single column with Linkedin company urls"
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
              variant="filled"
            />
          </Flex>

          <NumberInput
            description="Delay between pages in seconds"
            label="Delay"
            max={20}
            min={1}
            onChange={(value) => setValue('timeout', Number(value) || 3)}
            value={values.timeout}
            variant="filled"
          />

          <Select
            label="Scrape type"
            description="What data you want to scrape"
            data={[
              { value: ScrapeTaskType.CompanyInfo, label: 'Company Info' },
              { value: ScrapeTaskType.CompanyJobs, label: 'Company Jobs' },
            ]}
            onChange={(value) => setValue('type', value as ScrapeTaskType)}
            value={values.type}
            variant="filled"
          />

          <Flex mt="16">
            <Button w="200" type="submit">Start scraping</Button>
          </Flex>
        </Flex>
      </form>
    </Wrapper>
  );
};
