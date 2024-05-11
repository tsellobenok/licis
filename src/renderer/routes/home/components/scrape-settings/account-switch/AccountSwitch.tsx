import { useState } from 'react';
import {
  ActionIcon,
  Combobox,
  Flex,
  InputBase,
  Text,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import { IconPlug, IconPlugConnected } from '@tabler/icons-react';
import log from 'electron-log';

import { AccountOption } from './AccountOption';
import { AccountModal } from './AccountModal';

import { Account, AppConfig } from '../../../../../../types';

interface Props {
  config: AppConfig | null;
  updateConfig: (data: Partial<AppConfig>) => void;
}

export const AccountSwitch = ({ config, updateConfig }: Props) => {
  const [modalData, setModalData] = useState<Partial<Account> | null>(null);

  const accounts = config?.accounts || [];
  const selectedOption = accounts.find((acc) => acc.selected);

  const closeModal = () => setModalData(null);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () =>
      combobox.selectOption(accounts.findIndex((acc) => acc.selected)),
  });

  const onRemoveAccount = async (id: string) => {
    const newAccounts = accounts.filter((acc) => acc.id !== id);
    const [first, ...rest] = newAccounts;

    // If selected removed, make next one selected
    if (!newAccounts.find((a) => a.selected)) {
      updateConfig({
        accounts: first
          ? [
              {
                ...first,
                selected: true,
              },
              ...rest,
            ]
          : [],
      });

      return;
    }

    updateConfig({
      accounts: newAccounts,
    });
  };

  const onEdit = (id: string) => {
    setModalData(config?.accounts?.find((a) => a.id === id) || null);
  };

  const onSubmitAccount = async (data: Partial<Account>) => {
    try {
      if (data.type === 'manual') {
        const existing = accounts.find((acc) => acc.id === data.id);
        const newAccounts = existing
          ? accounts.map((acc) =>
              acc.id === data.id
                ? { ...data, selected: true }
                : { ...acc, selected: false },
            )
          : [
              ...accounts.map((acc) => ({ ...acc, selected: false })),
              {
                ...data,
                selected: true,
              },
            ];

        await updateConfig({
          accounts: newAccounts,
        });

        closeModal();

        return;
      }

      const connectedAccData = await window.electron.ipcRenderer.invoke(
        'connect-linkedin',
        data,
      );

      const existing = accounts.find((acc) => acc.id === data.id);
      const newItem = { ...data, ...connectedAccData, selected: true };

      const newAccounts = existing
        ? accounts.map((acc) =>
            acc.id === data.id ? newItem : { ...acc, selected: false },
          )
        : [...accounts.map((acc) => ({ ...acc, selected: false })), newItem];

      await updateConfig({
        accounts: newAccounts,
      });
    } catch (err) {
      log.error('Failed to add new or edit existing account');
      log.error(err);
    }

    closeModal();
  };

  return (
    <>
      <Combobox
        resetSelectionOnOptionHover
        onOptionSubmit={(id) => {
          if (id === 'add-new') {
            setModalData({});
          } else {
            const newAccounts = accounts.map((acc) => ({
              ...acc,
              selected: acc.id === id,
            }));

            combobox.selectOption(newAccounts.findIndex((acc) => acc.selected));
            updateConfig({
              accounts: newAccounts,
            });
          }

          combobox.closeDropdown();
        }}
        store={combobox}
        withinPortal={false}
      >
        <Combobox.Target>
          <InputBase
            // label="Select or add an account"
            // description="You can connect new account or edit an existing one"
            error={
              !!selectedOption && !selectedOption.liAt
                ? 'Account have to be reconnected'
                : ''
            }
            component="button"
            multiline
            onClick={() => combobox.toggleDropdown()}
            pointer
            rightSection={
              <Flex
                align="center"
                gap="0"
                justify="end"
                onClick={() => combobox.toggleDropdown()}
                pl="8"
                pr="8"
                style={{ cursor: 'pointer' }}
                w="100%"
              >
                {!!selectedOption && !selectedOption.liAt && (
                  <Tooltip label="Reconnect account">
                    <ActionIcon
                      c="red"
                      onClick={(e) => (
                        e.stopPropagation(),
                        selectedOption.type === 'auto'
                          ? onSubmitAccount(selectedOption)
                          : onEdit(selectedOption.id)
                      )}
                      variant="subtle"
                    >
                      <IconPlug size="16" />
                    </ActionIcon>
                  </Tooltip>
                )}

                <Combobox.Chevron style={{ pointerEvents: 'none' }} />
              </Flex>
            }
            rightSectionWidth={60}
            type="button"
            variant="filled"
          >
            <AccountOption
              empty={!selectedOption}
              key={selectedOption?.id + '_selected'}
              {...(selectedOption || {})}
            />
          </InputBase>
        </Combobox.Target>

        <Combobox.Dropdown w="400">
          <Combobox.Option value="add-new">
            <Flex gap="sm" align="center">
              <IconPlugConnected size="16" />
              <Text size="xs">Connect new account</Text>
            </Flex>
          </Combobox.Option>
          <Combobox.Options>
            {accounts.map((item) => (
              <Combobox.Option
                key={item.id}
                selected={item.selected}
                value={item.id}
              >
                <AccountOption
                  editable
                  key={item.id}
                  onClose={() => combobox.closeDropdown()}
                  onEdit={onEdit}
                  onReconnect={onSubmitAccount}
                  onRemove={onRemoveAccount}
                  {...item}
                />
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      <AccountModal
        defaultValues={modalData}
        key={JSON.stringify(modalData)}
        onClose={closeModal}
        onSubmit={onSubmitAccount}
        opened={!!modalData}
      />
    </>
  );
};
