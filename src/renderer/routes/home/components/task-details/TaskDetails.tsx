import { Button, Flex, Text, Title } from '@mantine/core';
import { useTimeLeft } from '../../hooks';

import { Wrapper } from './TaskDetails.styles';
import { ScrapeTask, TaskStatus } from '../../../../../types';
import log from 'electron-log/renderer';
import { RESULTS_FILENAME, RESULTS_PATH } from '../../../../../const';

const TASK_STATUS_MESSAGE: Record<ScrapeTask['status'], string> = {
  [TaskStatus.InProgress]: 'in progress',
  [TaskStatus.Completed]: 'completed',
  [TaskStatus.Failed]: 'failed',
  [TaskStatus.Partial]: 'partially succeed',
};

export const TaskDetails = ({
  task,
  clearTask,
}: {
  task: ScrapeTask;
  clearTask: () => void;
}) => {
  // const timeLeft = useTimeLeft(task);

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

  return (
    <Wrapper>
      <Flex gap="xs" direction="column">
        <div>
          <Title order={3}>
            <strong>Task {TASK_STATUS_MESSAGE[task.status]}</strong>
          </Title>
          {/* <Text c="gray" size="xs"> */}
          {/*   {timeLeft} */}
          {/* </Text> */}
          {task.failReason && (
            <Text c="red" size="xs">
              {task.failReason}
            </Text>
          )}
        </div>
        <div>
          <div>
            {task.status === TaskStatus.InProgress
              ? 'Scraping'
              : 'Scraped'}{' '}
            <strong>{task.current}</strong> of <strong>{task.total}</strong>{' '}
            companies
            {task.type === 'company-jobs' && (
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

        {task?.status !== TaskStatus.InProgress && (
          <Flex gap="sm" mt="16">
            <Button onClick={clearTask} variant="outline">
              Start a new one
            </Button>

            <Button onClick={onDownload}>Download results</Button>
          </Flex>
        )}
      </Flex>
    </Wrapper>
  );
};
