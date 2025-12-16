import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BlockDto {
  @IsString()
  @IsOptional()
  number: string;

  @IsString()
  @IsOptional()
  hash: string;

  @IsString()
  @IsOptional()
  timestamp: string;
}

export class TxDto {
  @IsString()
  @IsOptional()
  hash: string;

  @IsString()
  @IsOptional()
  gas: string;

  @IsString()
  @IsOptional()
  gasPrice: string;

  @IsString()
  @IsOptional()
  nonce: string;

  @IsString()
  @IsOptional()
  input: string;

  @IsString()
  @IsOptional()
  transactionIndex: string;

  @IsString()
  @IsOptional()
  fromAddress: string;

  @IsString()
  @IsOptional()
  toAddress: string;

  @IsString()
  @IsOptional()
  value: string;

  @IsString()
  @IsOptional()
  type: string;

  @IsString()
  @IsOptional()
  receiptCumulativeGasUsed: string;

  @IsString()
  @IsOptional()
  receiptGasUsed: string;

  @IsString()
  @IsOptional()
  receiptStatus: string;

  @IsOptional()
  @IsString()
  v?: string;

  @IsOptional()
  @IsString()
  r?: string;

  @IsOptional()
  @IsString()
  s?: string;

  @IsOptional()
  @IsString()
  receiptContractAddress?: string;

  @IsOptional()
  @IsString()
  receiptRoot?: string;
}

export class Erc20TransferDto {
  transactionHash: string;
  logIndex: string;
  contract: string;
  triggered_by: any[];
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: string;
  valueWithDecimals: string;
  possibleSpam: boolean;
}

export class MoralisWebhookDto {
  @IsBoolean()
  @IsOptional()
  confirmed: boolean;

  @IsString()
  @IsOptional()
  chainId: string;

  @IsArray()
  @IsOptional()
  abi: any[];

  @IsString()
  @IsOptional()
  streamId: string;

  @IsString()
  @IsOptional()
  tag: string;

  @IsNumber()
  @IsOptional()
  retries: number;

  @ValidateNested()
  @IsOptional()
  @Type(() => BlockDto)
  block: BlockDto;

  @IsArray()
  @IsOptional()
  logs: any[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TxDto)
  txs: TxDto[];

  @IsArray()
  @IsOptional()
  txsInternal: any[];

  @IsArray()
  @IsOptional()
  erc20Transfers: Erc20TransferDto[];

  @IsArray()
  @IsOptional()
  erc20Approvals: any[];

  @IsArray()
  @IsOptional()
  nftTokenApprovals: any[];

  @IsObject()
  @IsOptional()
  nftApprovals: { ERC721: any[]; ERC1155: any[] };

  @IsArray()
  @IsOptional()
  nftTransfers: any[];

  @IsArray()
  @IsOptional()
  nativeBalances: any[];
}
