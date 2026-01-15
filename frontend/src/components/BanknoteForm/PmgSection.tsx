import { Group, Stack, Checkbox, Box, Text, Button, TextInput, ActionIcon } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { BanknoteFormData } from '../../types/banknote';

type PmgSectionProps = {
  form: UseFormReturnType<BanknoteFormData>;
  pmgComments: string[];
  isProcessing: boolean;
  onAddComment: () => void;
  onRemoveComment: (index: number) => void;
  onCommentChange: (index: number, value: string) => void;
};

export function PmgSection({
  form,
  pmgComments,
  isProcessing,
  onAddComment,
  onRemoveComment,
  onCommentChange,
}: PmgSectionProps) {
  return (
      <Group>
      <Stack gap="xs" mr={32}>
        <Checkbox
          label="EPQ"
          disabled={isProcessing}
          {...form.getInputProps('isEpq', { type: 'checkbox' })}
        />
        <Checkbox
          label="Specimen"
          disabled={isProcessing}
          checked={form.values.isSpecimen}
          onChange={(event) => {
            form.setFieldValue('isSpecimen', event.currentTarget.checked);
            if (event.currentTarget.checked) {
              form.setFieldValue('serialNumber', '');
            }
          }}
        />
      </Stack>
      
      <Box style={{ flex: 1 }}>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>PMG Comments</Text>
          <Button
            size="xs"
            variant="light"
            disabled={isProcessing}
            leftSection={<IconPlus size={14} />}
            onClick={onAddComment}
          >
            Add Comment
          </Button>
        </Group>
        <Stack gap="xs">
          {pmgComments.map((comment, index) => (
            <Group key={index} gap="xs" align="flex-start">
              <TextInput
                placeholder="Comment from PMG"
                disabled={isProcessing}
                value={comment}
                onChange={(e) => onCommentChange(index, e.target.value)}
                style={{ flex: 1 }}
              />
              {pmgComments.length > 1 && (
                <ActionIcon
                  color="red"
                  variant="subtle"
                  disabled={isProcessing}
                  onClick={() => onRemoveComment(index)}
                  mt={2}
                >
                  <IconX size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}
        </Stack>
      </Box>
    </Group>
  );
}

