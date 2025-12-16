export type ProcessWithdrawalParams = {
  userId: string;
  indexFromAddress: number;
  recipients: string[];
  amounts: string[]; // decimal strings
  tokenContractAddress: string;
  rpcUrl: string;
  mnemonic: string;
  indexOperatorAddress: number;
  indexFundingAddress: number;
  clientRequestId?: string;
  chainId?: number;
};
