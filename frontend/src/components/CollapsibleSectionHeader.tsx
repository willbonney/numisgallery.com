import {
  Group,
  Title,
  UnstyledButton,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface CollapsibleSectionHeaderProps {
  title: string | ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  titleOrder?: 4 | 5;
  showBorder?: boolean;
}

export function CollapsibleSectionHeader({
  title,
  isOpen,
  onToggle,
  titleOrder = 5,
  showBorder = true,
}: CollapsibleSectionHeaderProps) {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");

  return (
    <UnstyledButton
      onClick={onToggle}
      style={{ width: "100%", cursor: "pointer" }}
    >
      <Group
        justify="space-between"
        p="md"
        style={{
          borderBottom: showBorder
            ? `1px solid ${colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]}`
            : "none",
          backgroundColor:
            colorScheme === "dark"
              ? theme.colors.dark[6]
              : theme.colors.gray[0],
          borderRadius: theme.radius.sm,
        }}
      >
        <Title
          order={titleOrder}
          c={colorScheme === "dark" ? theme.colors.gray[0] : undefined}
        >
          {title}
        </Title>
        {isOpen ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
      </Group>
    </UnstyledButton>
  );
}
