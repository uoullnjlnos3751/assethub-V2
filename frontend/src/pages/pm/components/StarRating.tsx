import React from 'react';
import { Box } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 24,
  readOnly = false,
  disabled = false,
}) => {
  const inactive = readOnly || disabled || !onChange;
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Icon = filled ? StarIcon : StarBorderIcon;
        return (
          <Icon
            key={n}
            onClick={() => {
              if (!inactive) onChange?.(n);
            }}
            sx={{
              fontSize: size,
              cursor: inactive ? 'default' : 'pointer',
              color: filled ? 'warning.main' : 'action.disabled',
              transition: 'color .1s',
            }}
          />
        );
      })}
    </Box>
  );
};
