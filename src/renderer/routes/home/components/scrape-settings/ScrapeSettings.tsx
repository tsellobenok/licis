import { Checkbox, Flex, TextInput, Title } from '@mantine/core';

import { AccountSwitch } from './account-switch';

import { AppConfig } from '../../../../../types';
import { Group, GroupLabel, Wrapper } from './ScrapeSettings.styles';
import { Debug } from '../debug';

interface Props {
  config: AppConfig | null;
  updateConfig: (data: AppConfig) => Promise<void>;
}

export const ScrapeSettings = ({ config, updateConfig }: Props) => {
  if (!config) {
    return null;
  }

  return (
    <Wrapper>
      <Debug />

      <form>
        <Flex direction="column" gap="md" align="start" justify="start">
          <Title order={3}>Settings</Title>

          <Flex align="start" justify="start" gap="16">
            <Flex direction="column" gap="md">
              <Group>
                <GroupLabel>Account</GroupLabel>
                <AccountSwitch config={config} updateConfig={updateConfig} />
              </Group>

              <Group>
                <GroupLabel>System</GroupLabel>
                <Checkbox
                  defaultChecked={config.raiseTheHood}
                  description="Show scraping process in action! (make sure to get some 🍿)"
                  label="Raise the hood"
                  onChange={(e) =>
                    updateConfig({ raiseTheHood: e.target.checked })
                  }
                />
              </Group>
            </Flex>

            <Flex direction="column" gap="md">
              <Group>
                <GroupLabel>Company Info</GroupLabel>
                <Flex direction="column" gap="xs">
                  <Checkbox
                    defaultChecked={config.getLocations}
                    description="Gather employee counts across different countries from the People tab on LinkedIn"
                    label="Get people per location"
                    onChange={(e) =>
                      updateConfig({ getLocations: e.target.checked })
                    }
                  />
                </Flex>
              </Group>

              <Group>
                <GroupLabel>Company Jobs</GroupLabel>
                <Flex direction="column" gap="xs">
                  <TextInput
                    defaultValue={config.jobLocation}
                    description="Enter a specific location or type 'Worldwide' to fetch companies' job postings from all locations"
                    label="Jobs location"
                    onChange={(e) =>
                      updateConfig({ jobLocation: e.target.value })
                    }
                    variant="filled"
                  />
                </Flex>
              </Group>
            </Flex>
          </Flex>
        </Flex>
      </form>
    </Wrapper>
  );
};
