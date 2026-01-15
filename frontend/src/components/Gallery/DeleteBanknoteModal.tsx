import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type { Banknote } from '../../types/banknote';

interface DeleteBanknoteModalProps {
  opened: boolean;
  banknote: Banknote | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteBanknoteModal({
  opened,
  banknote,
  onClose,
  onConfirm,
}: DeleteBanknoteModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Banknote"
      centered
      zIndex={400}
    >
      <Stack gap="md">
        <Text>
          Are you sure you want to delete this banknote?
          {banknote && (
            <>
              <br />
              <Text component="span" fw={600} mt="sm" display="block">
                {banknote.country} - {banknote.faceValue} {banknote.currency}
              </Text>
            </>
          )}
        </Text>
        <Text size="sm" c="dimmed">
          This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button color="red" onClick={onConfirm}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

