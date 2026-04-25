export const getCellStatus = (cell) => {
  if (!cell) return 'free';
  const { rentalCount, hasBlock } = cell;
  if (rentalCount === 0 && !hasBlock) return 'free';
  if (rentalCount === 0 && hasBlock) return 'maintenance';
  if (rentalCount >= 2 && hasBlock) return 'mixed';
  if (rentalCount >= 2) return 'double';
  if (hasBlock) return 'mixed';
  return 'single';
};

