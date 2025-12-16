export default class GetWithdrawNativeFeeResponseVm {
  txCount: number;
  gasLimitPerTx: number;
  feePerGasWei: number;
  totalGasWei: number;
  totalGasNative: string;
  isEip1559: boolean;

  constructor(data: {
    txCount: number;
    gasLimitPerTx: bigint;
    feePerGasWei: bigint;
    totalGasWei: bigint;
    totalGasNative: string;
    isEip1559: boolean;
  }) {
    this.txCount = data.txCount;
    this.gasLimitPerTx = Number(data.gasLimitPerTx);
    this.feePerGasWei = Number(data.feePerGasWei);
    this.totalGasWei = Number(data.totalGasWei);
    this.totalGasNative = data.totalGasNative;
    this.isEip1559 = data.isEip1559;
  }
}
