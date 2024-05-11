import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { nanoid } from 'nanoid';
import {
  ActionIcon,
  Button,
  Flex,
  Divider,
  Modal,
  SegmentedControl,
  TextInput,
  Tooltip,
  PasswordInput,
} from '@mantine/core';
import { IconInfoHexagon } from '@tabler/icons-react';

import { Account } from '../../../../../../types';

interface Props {
  defaultValues: Partial<Account> | null;
  opened: boolean;
  onSubmit: (data: Account) => void;
  onClose: () => void;
}

const DEFAULT_FORM_VALUES: Partial<Account> = {
  email: '',
  liAt: '',
  name: '',
  password: '',
  type: 'auto',
};

export const AccountModal = ({
  defaultValues,
  onClose,
  onSubmit,
  opened,
}: Props) => {
  const { setValue, handleSubmit, watch, reset } = useForm<Account>({
    defaultValues: {
      id: nanoid(),
      ...DEFAULT_FORM_VALUES,
      ...(defaultValues || {}),
    },
  });
  const values = watch();

  useEffect(() => {
    reset();
  }, [opened]);

  const isEditing = !!Object.keys(defaultValues || {}).length;

  return (
    <Modal
      onClose={onClose}
      opened={opened}
      title={isEditing ? 'Update account' : 'Connect new account'}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex direction="column" gap="md">
          <SegmentedControl
            data={[
              { value: 'auto', label: 'Automatic' },
              { value: 'manual', label: 'Manual' },
            ]}
            onChange={(value) => setValue('type', value as 'auto' | 'manual')}
            value={values.type}
          />

          {values.type === 'auto' && (
            <>
              <TextInput
                description="LinkedIn account email"
                label="Email"
                onChange={(event) =>
                  setValue('email', event.currentTarget.value)
                }
                placeholder="john.doe@example.com"
                value={values.email}
              />
              <PasswordInput
                description="LinkedIn account password"
                label="Password"
                onChange={(event) =>
                  setValue('password', event.currentTarget.value)
                }
                placeholder="••••••••"
                value={values.password}
              />
            </>
          )}

          {values.type === 'manual' && (
            <>
              <TextInput
                description="Paste li_at cookie from your LinkedIn account here"
                label="LiAt cookie"
                onChange={(event) =>
                  setValue('liAt', event.currentTarget.value)
                }
                placeholder="AQEDAS0JovAFKxgqAAABjyqE..."
                rightSection={
                  <Tooltip label="See how to get it">
                    <ActionIcon
                      c="gray"
                      variant="subtle"
                      onClick={() =>
                        window.electron.ipcRenderer.invoke(
                          'open-in-browser',
                          'https://www.youtube.com/watch?v=S7i80ERXu_0&ab_channel=FabianMaume',
                        )
                      }
                    >
                      <IconInfoHexagon size="18" />
                    </ActionIcon>
                  </Tooltip>
                }
                value={values.liAt || ''}
              />
              <TextInput
                description="Name of your account"
                label="Name"
                onChange={(event) =>
                  setValue('name', event.currentTarget.value)
                }
                placeholder="John Doe"
                value={values.name}
              />
            </>
          )}

          <Divider />

          <Flex gap="sm" justify="end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button type="submit">
              {isEditing ? 'Save changes' : 'Add new account'}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Modal>
  );
};
