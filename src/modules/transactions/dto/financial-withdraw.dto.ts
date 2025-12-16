import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { WalletType } from '@/common/enums/wallet-type.enum';

export class FinancialWithdrawDto {
  @ApiProperty({
    enum: WalletType,
    description: 'Tipo de wallet del cual retirar el saldo',
    example: WalletType.GAS,
  })
  @IsEnum(WalletType)
  @IsNotEmpty()
  type: WalletType;

  @ApiProperty({
    description: 'ID de la moneda a transferir',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  currencyId: string;

  @ApiProperty({
    description: 'Monto a transferir',
    example: 0.01,
  })
  @IsNumber()
  @Min(0.00000001)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Dirección del wallet destino',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  address: string;
}
