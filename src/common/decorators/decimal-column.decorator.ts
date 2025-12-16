import { Column, ColumnOptions } from 'typeorm';

export function DecimalColumn(
  precision = 38,
  scale = 18,
  opts?: Partial<ColumnOptions>,
) {
  return Column({
    type: 'decimal',
    precision,
    scale,
    transformer: {
      to: (value?: string | number) => value?.toString(),
      from: (value: string) => value,
    },
    ...opts,
  });
}
