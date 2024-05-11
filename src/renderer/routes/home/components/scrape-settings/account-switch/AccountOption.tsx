import {
  ActionIcon,
  Avatar,
  Container,
  Flex,
  Text,
  Tooltip,
} from '@mantine/core';

import { IconPencil, IconPlug, IconTrash } from '@tabler/icons-react';

import { Account } from '../../../../../../types';
import { SelectItem } from './type';

interface Props extends SelectItem {
  editable: boolean;
  empty: boolean;
  onClose?: () => void;
  onEdit?: (id: string) => void;
  onReconnect?: (data: Partial<Account>) => void;
  onRemove?: (id: string) => void;
}

export const AccountOption = ({
  avatar,
  editable,
  email,
  empty,
  id,
  liAt,
  name,
  onClose,
  onEdit,
  onReconnect,
  onRemove,
  password,
  type,
}: Props) => {
  return (
    <Flex align="center">
      <Container fluid pl="0" pr="0" ml="0" mr="0" w="100%">
        <Flex gap="sm" align="center">
          <Avatar size={24} src={avatar}>
            {empty ? 'JD' : ''}
          </Avatar>
          <Flex direction="column" gap="0">
            <Text fw="bold" fz="12" c="black" opacity={0.6}>
              {empty ? 'John Doe?' : name}
            </Text>
            {(empty || email) && (
              <Text fz="10" fw="500" c="gray">
                {empty ? 'john.doe@email.com' : email}
              </Text>
            )}
          </Flex>
        </Flex>
      </Container>

      {editable && (
        <Flex
          gap="0"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {!liAt && (
            <Tooltip label="Reconnect account">
              <ActionIcon
                c="black"
                onClick={() => {
                  onClose?.();

                  if (type === 'auto') {
                    onReconnect?.({ id, email, password, type });
                  } else {
                    onEdit?.(id);
                  }
                }}
                variant="subtle"
              >
                <IconPlug size="18" />
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label="Edit account">
            <ActionIcon
              c="gray"
              variant="subtle"
              onClick={() => {
                onClose?.();
                onEdit?.(id);
              }}
            >
              <IconPencil size="18" />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Remove account">
            <ActionIcon
              c="red"
              variant="subtle"
              onClick={() => {
                onClose?.();
                onRemove?.(id);
              }}
            >
              <IconTrash size="18" />
            </ActionIcon>
          </Tooltip>
        </Flex>
      )}
    </Flex>
  );
};
