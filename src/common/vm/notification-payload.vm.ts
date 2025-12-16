import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';

// -----------------------------------------------------------------------------

export class NotificationPayloadVm {
  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiProperty({ description: 'Deposit data information' })
  deposits?: DepositNotificationVm;

  @ApiProperty({ description: 'Withdraw data information' })
  withdraws?: WithdrawNotificationVm;

  constructor(
    type: NotificationType,
    deposits: DepositNotificationVm,
    withdraws: WithdrawNotificationVm,
  ) {
    this.type = type;
    this.deposits = deposits;
    this.withdraws = withdraws;
  }
}

// -----------------------------------------------------------------------------

export class DepositNotificationVm {
  @ApiProperty({ description: 'Deposit amount' })
  amount: string;

  @ApiProperty({ description: 'Deposit status', enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty({ description: 'Deposit currency' })
  currency: string;

  @ApiProperty({ description: 'Deposit address' })
  address?: string;

  @ApiProperty({ description: 'Deposit tx hash' })
  txHash?: string;

  @ApiProperty({ description: 'Deposit block number' })
  blockNumber?: string;
}

// -----------------------------------------------------------------------------

export class WithdrawNotificationVm {
  @ApiProperty({ description: 'Withdraw id' })
  id?: string;

  @ApiProperty({ description: 'Withdraw amount' })
  amount: string;

  @ApiProperty({ description: 'Withdraw status', enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty({ description: 'Withdraw currency' })
  currency: string;

  @ApiProperty({ description: 'Withdraw address' })
  address?: string;

  @ApiProperty({ description: 'Withdraw tx hash' })
  txHash?: string;

  @ApiProperty({ description: 'Withdraw block number' })
  blockNumber?: string;
}
