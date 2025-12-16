/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BigNumberish,
  ethers,
  TransactionReceipt,
  TransactionResponse,
} from 'ethers';
import { EvmNetworkEnum } from '../enums/crypto-network.enum';
import { Currency } from '@/modules/currencies/entities/currency.entity';
import { cryptoCurrencies } from '@/config/currency.config';
import { CryptoAddress } from '@/modules/wallets/entities/crypto-address.entity';

export interface ChildWallet {
  path: string;
  address: string;
  publicKey: string;
}

@Injectable()
export class HdWalletUtils {
  /**
   * Derive ONE address for the requested network (EVM compatible).
   *
   * @param extendedPublicKey  xpub string
   * @param network            ignored for now (all use 44'/60'/0'/0/i)
   * @param index              account index, default 0
   */
  deriveAddress(
    extendedPublicKey: string,
    network: EvmNetworkEnum = EvmNetworkEnum.ETHEREUM,
    index = 0,
  ): ChildWallet {
    console.log('Creating address for ', network);

    // Para todas las redes EVM usamos m/44'/60'/0'/0/index
    const pathSuffix = `0/${index}`;
    const fullPath = `m/44'/60'/0'/0/${index}`;

    const node =
      ethers.HDNodeWallet.fromExtendedKey(extendedPublicKey).derivePath(
        pathSuffix,
      );

    return {
      path: fullPath,
      address: node.address,
      publicKey: node.publicKey,
    };
  }

  /**
   * Get xpub from mnemonic
   *
   * @param mnemonic
   * @returns
   */
  getxPub(mnemonic: string): string {
    const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
    return masterNode.neuter().extendedKey;
  }

  /**
   * Get private key from mnemonic
   *
   * @param mnemonic
   */
  getPrivateKey(mnemonic: string): string {
    const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
    return masterNode.privateKey;
  }

  /**
   * Get address from index and mnemonic
   *
   * @param mnemonic
   * @param index
   * @returns
   */
  getAddressFromIndex(mnemonic: string, index = 0): string {
    const pathSuffix = `0/${index}`;
    const node =
      ethers.HDNodeWallet.fromPhrase(mnemonic).derivePath(pathSuffix);
    return node.address.toLowerCase();
  }

  /**
   * Get balance for a given address and currency.
   *
   * @param address
   * @param currency
   */
  async getBalance(address: string, currency: Currency): Promise<string> {
    // 1. Obtener la configuración de la red
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    if (!config) {
      throw new NotFoundException('No crypto currency config found');
    }

    // 2. Obtener el provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // 3. Consultar si es un token ERC20/BEP20
    if (
      currency.isToken &&
      currency.smartContractAddress &&
      currency.smartContractAddress !== 'main'
    ) {
      // 4. Instanciar el contrato del token
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ];

      const tokenAddress = ethers.getAddress(
        currency.smartContractAddress.toLowerCase(),
      );
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        provider,
      );

      // 5. Consultar balance y decimales
      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals(),
      ]);

      // 6. Convertir a formato legible
      return ethers.formatUnits(balance as BigNumberish, decimals as string);
    }

    // 7. Leer el balance (wei)
    const balanceWei = await provider.getBalance(address);

    // 8. Convierte a ether
    return ethers.formatEther(balanceWei);
  }

  /**
   * Create a transfer transaction
   *
   * @param currency
   * @param from
   * @param to
   * @param amount
   * @returns
   */
  async createTransferTx(
    address: CryptoAddress,
    mnemonic: string,
    currency: Currency,
    from: string,
    to: string,
    amount: string,
  ) {
    // 1. Obtener la configuración de la red
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    if (!config) {
      throw new NotFoundException('No crypto currency config found');
    }

    // 2. Obtener el provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // 3. Wallet/Signer se genera a partir de la frase mnemotécnica y el index de la dirección
    const pathSuffix = `0/${address.index}`;
    const signer = ethers.HDNodeWallet.fromPhrase(mnemonic)
      .derivePath(pathSuffix)
      .connect(provider);

    // 4. Chequea balance
    // const balanceWei = await provider.getBalance(from);
    // const balanceBNB = ethers.formatEther(balanceWei);
    const balance = await this.getBalance(from, currency);
    if (parseFloat(balance) < parseFloat(amount)) {
      throw new BadRequestException('Insufficient funds');
    }

    // 5. Obtener datos de comisiones
    const feeData = await provider.getFeeData();

    console.log(
      `Getting fees for transfer an value of ${amount} from ${from} to ${to} =>`,
      feeData,
    );

    // 6. Transacción
    let tx: TransactionResponse;

    if (
      !currency.smartContractAddress ||
      currency.smartContractAddress === 'main'
    ) {
      // ========== TRANSFERENCIA DE BNB ==========d
      tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(amount.toString()),
        gasLimit: 21000,
        ...(feeData.gasPrice
          ? { gasPrice: feeData.gasPrice }
          : {
              maxFeePerGas: feeData.maxFeePerGas!,
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
            }),
      });
    } else {
      // ========== TRANSFERENCIA DE TOKEN BEP20 ==========
      const erc20Abi = [
        'function transfer(address to, uint256 value) returns (bool)',
        'function decimals() view returns (uint8)',
      ];
      const tokenAddress = ethers.getAddress(
        currency.smartContractAddress.toLowerCase(),
      );
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);

      const decimals: number = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount.toString(), decimals);

      tx = await tokenContract.transfer(to, amountWei, {
        ...(feeData.gasPrice
          ? { gasPrice: feeData.gasPrice }
          : {
              maxFeePerGas: feeData.maxFeePerGas!,
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
            }),
      });
    }

    // 7. Esperar minado
    const receipt = await tx.wait();

    console.log(`Transfer completed! Transaction hash: ${receipt?.hash}`);

    return receipt;
  }

  async createNativeTransferTx(
    addressIndex: number,
    mnemonic: string,
    currency: Currency,
    from: string,
    to: string,
    amount: string,
    rpcUrl: string,
  ) {
    // 2. Obtener el provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // 3. Wallet/Signer se genera a partir de la frase mnemotécnica y el index de la dirección
    const pathSuffix = `0/${addressIndex}`;
    const signer = ethers.HDNodeWallet.fromPhrase(mnemonic)
      .derivePath(pathSuffix)
      .connect(provider);

    // 4. Chequea balance
    const balance = await this.getBalance(from, currency);
    if (parseFloat(balance) < parseFloat(amount)) {
      throw new BadRequestException('Insufficient funds');
    }

    // 5. Obtener datos de comisiones
    const feeData = await provider.getFeeData();

    // 6. Transacción
    const tx = await signer.sendTransaction({
      to,
      value: ethers.parseEther(amount.toString()),
      gasLimit: 21000,
      ...(feeData.gasPrice
        ? { gasPrice: feeData.gasPrice }
        : {
            maxFeePerGas: feeData.maxFeePerGas!,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
          }),
    });

    // 7. Esperar minado
    const receipt = await tx.wait();

    console.log(`Transfer completed! Transaction hash: ${receipt?.hash}`);

    return receipt;
  }

  /**
   * Estimate total gas cost for X native transfers, ignoring amount/destination.
   * Pass only the count of transactions to estimate.
   */
  async estimateNativeGas(
    currency: Currency,
    txCount: number = 1,
    rpcUrl?: string,
  ): Promise<{
    txCount: number;
    gasLimitPerTx: bigint;
    feePerGasWei: bigint;
    totalGasWei: bigint;
    totalGasNative: string;
    isEip1559: boolean;
  }> {
    if (!txCount || txCount <= 0) {
      throw new BadRequestException('txCount must be greater than zero');
    }

    const config = cryptoCurrencies.find((c) => c.id === currency.configId);
    const rpc = rpcUrl ?? config?.rpcUrl;
    if (!rpc) {
      throw new NotFoundException('No RPC URL found for currency');
    }

    const provider = new ethers.JsonRpcProvider(rpc);

    const gasLimitPerTx = 21000n;
    const feeData = await provider.getFeeData();

    let feePerGasWei: bigint = 0n;
    let isEip1559 = false;

    if (feeData.gasPrice) {
      feePerGasWei = feeData.gasPrice;
      isEip1559 = false;
    } else {
      isEip1559 = true;
      const latestBlock = await provider.getBlock('latest');
      const base = latestBlock?.baseFeePerGas ?? 0n;
      const tip = feeData.maxPriorityFeePerGas ?? 0n;
      const maxFee = feeData.maxFeePerGas ?? 0n;
      const expected = base + tip;
      feePerGasWei =
        maxFee > 0n ? (expected > maxFee ? maxFee : expected) : expected;
    }

    const perTxWei = gasLimitPerTx * feePerGasWei;
    const totalGasWei = perTxWei * BigInt(txCount);
    const totalGasNative = ethers.formatUnits(
      totalGasWei,
      currency.decimals ?? 18,
    );

    return {
      txCount,
      gasLimitPerTx,
      feePerGasWei,
      totalGasWei,
      totalGasNative,
      isEip1559,
    };
  }

  async getTrxReceipt(
    txHash: string,
    currency: Currency,
  ): Promise<TransactionReceipt> {
    // 1. Obtener la configuración de la red
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    if (!config) {
      throw new NotFoundException('No crypto currency config found');
    }

    // 2. Obtener el provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // 3. Obtener el receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      throw new NotFoundException('Transaction not found');
    }

    return receipt;
  }

  async getTrx(
    txHash: string,
    currency: Currency,
  ): Promise<TransactionResponse> {
    // 1. Obtener la configuración de la red
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    if (!config) {
      throw new NotFoundException('No crypto currency config found');
    }

    // 2. Obtener el provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // 3. Obtener el receipt
    const trx = await provider.getTransaction(txHash);

    if (!trx) {
      throw new NotFoundException('Transaction not found');
    }

    return trx;
  }

  async getTokenTransfer(txHash: string, currency: Currency) {
    // 1. Obtener la configuración de la red
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    if (!config) {
      throw new NotFoundException('No crypto currency config found');
    }

    // 2. Obtener el provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // 3. Obtener el receipt (incluye logs)
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      throw new Error('Receipt not found');
    }

    // 4. Buscar logs de Transfer (ERC20/BEP20)
    const transferEventSig = ethers.id('Transfer(address,address,uint256)');

    const transferLogs = receipt.logs.filter(
      (log) => log.topics[0] === transferEventSig,
    );

    // 5. Decodificar cada transferencia
    const iface = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ]);

    const decoded = transferLogs.map((log) => iface.parseLog(log));

    return {
      receipt,
      transfers: decoded.map((d) => ({
        from: d?.args.from,
        to: d?.args.to,
        value: d?.args.value,
      })),
    };
  }

  /**
   * Native-only split transfer: one source address -> multiple destinations.
   * Validates balance against sum(outputs) + estimated gas (21000 per tx).
   */
  async createNativeSplitTransferTx(
    currency: Currency,
    outputs: { to: string; amount: string }[],
    sharedMnemonic: string,
    nativeAddressIndex: number,
    waitForReceipts: boolean = true,
  ): Promise<{
    txs: TransactionResponse[];
    receipts?: TransactionReceipt[];
    gas: {
      txCount: number;
      gasLimitPerTx: bigint;
      feePerGasWei: bigint;
      totalGasWei: bigint;
      totalGasNative: string;
      isEip1559: boolean;
    };
  }> {
    if (!outputs || outputs.length < 1) {
      throw new BadRequestException('At least one output is required');
    }

    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    if (!config) {
      throw new NotFoundException('No crypto currency config found');
    }

    const rpc = config.rpcUrl;

    const provider = new ethers.JsonRpcProvider(rpc);

    const pathSuffix = `0/${nativeAddressIndex}`;
    const signer = ethers.HDNodeWallet.fromPhrase(sharedMnemonic)
      .derivePath(pathSuffix)
      .connect(provider);

    const gas = await this.estimateNativeGas(currency, outputs.length, rpc);

    const decimals = currency.decimals ?? 18;
    const totalOutWei = outputs
      .map((o) => ethers.parseUnits(o.amount.toString(), decimals))
      .reduce((acc, v) => acc + v, 0n);

    const balanceWei = await provider.getBalance(signer.address);
    const requiredWei = totalOutWei + gas.totalGasWei;
    if (balanceWei < requiredWei) {
      throw new BadRequestException('Insufficient funds for amount + fees');
    }

    const feeData = await provider.getFeeData();
    const txs: TransactionResponse[] = [];
    const receipts: TransactionReceipt[] = [];
    for (const out of outputs) {
      if (!out.to) throw new BadRequestException('Output missing destination');
      if (!out.amount) throw new BadRequestException('Output missing amount');

      const amountWei = ethers.parseUnits(out.amount.toString(), decimals);
      const tx = await signer.sendTransaction({
        to: out.to,
        value: amountWei,
        gasLimit: 21000,
        ...(feeData.gasPrice
          ? { gasPrice: feeData.gasPrice }
          : {
              maxFeePerGas: feeData.maxFeePerGas!,
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
            }),
      });
      txs.push(tx);
      if (waitForReceipts) {
        const r = await tx.wait();
        if (r) receipts.push(r);
      }
    }

    return { txs, receipts: waitForReceipts ? receipts : undefined, gas };
  }
}
