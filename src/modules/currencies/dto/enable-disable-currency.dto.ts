import { IsBoolean } from 'class-validator';

export class EnableDisableCurrencyDto {
  @IsBoolean()
  isActive?: boolean;
}
