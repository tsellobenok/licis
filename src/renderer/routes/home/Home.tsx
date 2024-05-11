import { Flex, Loader, Text, LoadingOverlay } from '@mantine/core';

import { TaskDetails } from './components/task-details';
import { ScrapeSettings } from './components/scrape-settings';
import { ScrapeForm } from './components/scrape-form';

import { useConfig, useTask } from './hooks';

export const Home = () => {
  const { task, createTask, clearTask } = useTask();
  const { config, isConfigLoading, updateConfig } = useConfig();

  return (
    <Flex direction="column" gap="sm" p="48">
      <LoadingOverlay
        visible={isConfigLoading}
        loaderProps={{
          children: (
            <Flex direction="column" align="center" justify="center" gap="12">
              <Loader />
              <Text c="gray" fz="14">
                Checking LinkedIn connection...
              </Text>
            </Flex>
          ),
        }}
      />

      {!task && (
        <Flex align="start" gap="24">
          <ScrapeForm createTask={createTask} />
          <ScrapeSettings config={config} updateConfig={updateConfig} />
        </Flex>
      )}

      {!!task && <TaskDetails task={task} clearTask={clearTask} />}
    </Flex>
  );
};
