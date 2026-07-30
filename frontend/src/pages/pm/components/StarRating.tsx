import React from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  color?: string;
  readOnly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 24,
  color = '#ff9500',
  readOnly = false,
}) => {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => {
            if (!readOnly && onChange) onChange(n);
          }}
          style={{
            fontSize: size,
            cursor: readOnly ? 'default' : 'pointer',
            color: n <= value ? color : '#d2d2d7',
            transition: 'color .1s',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};
