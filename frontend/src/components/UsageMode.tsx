import { Box, Stack, Typography, Avatar, Tooltip } from '@mui/material';
import type { Mode } from '../config';
import { USER1_NAME, USER2_NAME } from '../config';

type Props = {
  selected: Mode;
  onSelect?: (mode: Mode) => void;
  size?: 'small' | 'large';
};

export default function UsageMode({ selected, onSelect, size = 'small' }: Props) {
  if (size === 'large') {
    const src = selected === 'user_1' ? '/penguin-male.svg' : '/penguin-female.svg';
    const alt = selected === 'user_1' ? USER1_NAME : USER2_NAME;
    return (
      <Avatar alt={alt} src={src} sx={{ width: 72, height: 72 }} />
    );
  }

  // small: label + two icons to select
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="caption" color="text.secondary">Using as:</Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <Tooltip title={USER1_NAME}>
          <Avatar
            alt={USER1_NAME}
            src="/penguin-male.svg"
            onClick={() => onSelect?.('user_1')}
            sx={{ width: 26, height: 26, cursor: onSelect ? 'pointer' : 'default', outline: selected === 'user_1' ? '2px solid' : 'none', outlineColor: 'primary.main', outlineOffset: '2px' }}
          />
        </Tooltip>
        <Tooltip title={USER2_NAME}>
          <Avatar
            alt={USER2_NAME}
            src="/penguin-female.svg"
            onClick={() => onSelect?.('user_2')}
            sx={{ width: 26, height: 26, cursor: onSelect ? 'pointer' : 'default', outline: selected === 'user_2' ? '2px solid' : 'none', outlineColor: 'primary.main', outlineOffset: '2px' }}
          />
        </Tooltip>
      </Box>
    </Stack>
  );
}
