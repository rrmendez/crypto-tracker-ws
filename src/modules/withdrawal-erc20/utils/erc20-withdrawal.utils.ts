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
import { Currency } from '@/modules/currencies/entities/currency.entity';
import { cryptoCurrencies } from '@/config/currency.config';
import { CryptoAddress } from '@/modules/wallets/entities/crypto-address.entity';

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
];

const BATCH_SPENDER_ABI = [
  // Ajusta el ABI si tu contrato difiere
  'function batchTransferFrom(address token, address from, address[] recipients, uint256[] amounts) external',
];

const BATCH_SPENDER_DEPLOY_ABI = [
  'constructor(address admin, address operator)',
];

@Injectable()
export class Erc20WithdrawalUtils {
  // ------------ helpers de red / signer ------------
  private getProvider(rpcUrl: string) {
    return new ethers.JsonRpcProvider(rpcUrl);
  }

  private assertIndex(index: unknown): number {
    const n = Number(index);
    if (!Number.isInteger(n) || n < 0) {
      throw new BadRequestException(`Invalid HD index: ${index}`);
    }
    return n;
  }

  private getSignerFromMnemonic(
    mnemonic: string,
    index: number,
    provider: ethers.JsonRpcProvider,
  ) {
    const i = this.assertIndex(index);

    // 3. Wallet/Signer se genera a partir de la frase mnemotécnica y el index de la dirección
    const pathSuffix = `0/${i}`;
    const signer = ethers.HDNodeWallet.fromPhrase(mnemonic)
      .derivePath(pathSuffix)
      .connect(provider);
    return signer;
  }

  private getSignerFromMnemonicMaster(
    mnemonic: string,
    provider: ethers.JsonRpcProvider,
  ) {
    const i = this.assertIndex(0);
    const cleanMnemonic = mnemonic.trim().replace(/\s+/g, ' ');
    const path = `m/44'/60'/0'/0/${i}`; // ✅ ruta EVM estándar
    const wallet = ethers.HDNodeWallet.fromPhrase(
      cleanMnemonic,
      undefined,
      path,
    );
    return wallet.connect(provider);
  }

  private pickFeeOpts = async (provider: ethers.JsonRpcProvider) => {
    const feeData = await provider.getFeeData();
    return feeData.gasPrice
      ? { gasPrice: feeData.gasPrice }
      : {
          maxFeePerGas: feeData.maxFeePerGas!,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
        };
  };

  private async getTokenDecimals(
    provider: ethers.JsonRpcProvider,
    token: string,
  ) {
    const t = new ethers.Contract(token, ERC20_ABI, provider);
    const d: number = await t.decimals();
    return d;
  }

  private toUnits(amount: string, decimals: number) {
    return ethers.parseUnits(amount, decimals);
  }

  private norm(addr?: string) {
    return addr?.trim().toLowerCase();
  }

  // ========== 1) TOP-UP DE NATIVO ==========
  /**
   * Envía nativo (BNB/ETH/etc.) a la dirección "to".
   * @param fundingAddr dirección de fondos (hot wallet) con índice en HD
   * @param mnemonic frase del wallet maestro
   * @param currency red (rpc se toma de currency.configId)
   * @param to destino (dirección de retiro del usuario)
   * @param amountNative monto en string decimal (ej. "0.005")
   */
  async topupNativeTo(
    indexFundingAddr: number,
    mnemonic: string,
    rpcUrl: string,
    to: string,
    amountNative: string,
  ): Promise<TransactionReceipt> {
    const provider = this.getProvider(rpcUrl);
    const signer = this.getSignerFromMnemonic(
      mnemonic,
      indexFundingAddr,
      provider,
    );
    const feeOpts = await this.pickFeeOpts(provider);

    const tx = await signer.sendTransaction({
      to: this.norm(to),
      value: ethers.parseEther(amountNative),
      ...feeOpts,
    });

    const receipt = await tx.wait();
    if (!receipt) throw new NotFoundException('No receipt for topup tx');
    return receipt;
  }

  // ========== 2) APPROVE ERC-20 ==========
  /**
   * Hace approve desde la dirección de retiro (owner) hacia el contrato "spender".
   * @param ownerAddr dirección de retiro (HD index del usuario)
   * @param mnemonic frase del wallet maestro
   * @param currency red (rpc)
   * @param tokenAddress contrato ERC-20
   * @param spenderAddress contrato de retiros (spender)
   * @param amount monto decimal como string; usa "max" para MaxUint256
   */
  async approveTokenForWithdrawal(
    indexOwnerAddr: number,
    mnemonic: string,
    rpcUrl: string,
    tokenAddress: string,
    spenderAddress: string,
    amount: string | 'max' = 'max',
  ): Promise<TransactionReceipt> {
    const provider = this.getProvider(rpcUrl);
    const signer = this.getSignerFromMnemonic(
      mnemonic,
      indexOwnerAddr,
      provider,
    );
    const feeOpts = await this.pickFeeOpts(provider);

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const decimals: number = await token.decimals();

    const value =
      amount === 'max' ? ethers.MaxUint256 : this.toUnits(amount, decimals);

    const tx: TransactionResponse = await token.approve(
      this.norm(spenderAddress),
      value,
      { ...feeOpts },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new NotFoundException('No receipt for approve tx');
    return receipt;
  }

  /**
   * Consulta allowance actual (owner → spender).
   */
  async getAllowance(
    rpcUrl: string,
    tokenAddress: string,
    owner: string,
    spender: string,
  ) {
    const provider = this.getProvider(rpcUrl);
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const allowance: bigint = await token.allowance(
      this.norm(owner),
      this.norm(spender),
    );
    const decimals: number = await token.decimals();
    return {
      raw: allowance,
      human: ethers.formatUnits(allowance, decimals),
      decimals,
    };
  }

  // ========== 3) EJECUTAR CONTRATO DE RETIROS ==========
  /**
   * Ejecuta el contrato de retiros tipo BatchSpender.batchTransferFrom
   * firmado por el OPERADOR (hot wallet operador).
   * Convierte amounts decimales a unidades del token automáticamente.
   *
   * @param operatorAddr dirección operador (HD index de la tesorería operadora)
   * @param mnemonic frase del wallet maestro
   * @param currency red (rpc)
   * @param contractAddress contrato de retiros (BatchSpender)
   * @param tokenAddress contrato ERC-20 del token
   * @param from address del owner de los tokens (quien dio approve al contrato)
   * @param recipients array de destinos
   * @param amounts array de montos decimales (mismo orden que recipients)
   */
  async executeBatchWithdrawal(
    indexOperatorAddr: number,
    mnemonic: string,
    rpcUrl: string,
    contractAddress: string,
    tokenAddress: string,
    from: string,
    recipients: string[],
    amounts: string[],
  ): Promise<TransactionReceipt> {
    if (
      !recipients?.length ||
      !amounts?.length ||
      recipients.length !== amounts.length
    ) {
      throw new BadRequestException(
        'recipients and amounts must be non-empty and same length',
      );
    }

    const provider = this.getProvider(rpcUrl);
    const signer = this.getSignerFromMnemonic(
      mnemonic,
      indexOperatorAddr,
      provider,
    );
    const feeOpts = await this.pickFeeOpts(provider);

    const decimals = await this.getTokenDecimals(provider, tokenAddress);
    const parsedAmts: BigNumberish[] = amounts.map((a) =>
      this.toUnits(a, decimals),
    );
    const normRecipients = recipients.map((r) => this.norm(r));

    const contract = new ethers.Contract(
      contractAddress,
      BATCH_SPENDER_ABI,
      signer,
    );

    const tx: TransactionResponse = await contract.batchTransferFrom(
      this.norm(tokenAddress),
      this.norm(from),
      normRecipients,
      parsedAmts,
      { ...feeOpts },
    );

    const receipt = await tx.wait();
    if (!receipt)
      throw new NotFoundException('No receipt for withdrawal execution');
    return receipt;
  }

  // ---------- utilidades opcionales ----------
  /**
   * Chequea si el owner tiene allowance >= total deseado.
   */
  async hasSufficientAllowance(
    rpcUrl: string,
    tokenAddress: string,
    owner: string,
    spender: string,
    neededAmount: string,
  ) {
    const { raw, decimals } = await this.getAllowance(
      rpcUrl,
      tokenAddress,
      owner,
      spender,
    );
    const needed = this.toUnits(neededAmount, decimals);
    return raw >= needed;
  }

  /**
   * Obtiene balance nativo (formateado a ether).
   */
  async getNativeBalance(address: string, rpcUrl: string) {
    const provider = this.getProvider(rpcUrl);
    const wei = await provider.getBalance(this.norm(address)!);
    return ethers.formatEther(wei);
  }

  /**
   * Obtiene la dirección pública derivada de un índice (HD derivation path m/44'/60'/0'/0/index)
   * para una frase mnemotécnica dada.
   *
   * @param mnemonic frase mnemotécnica del wallet HD
   * @param index índice (por defecto 0)
   * @returns dirección pública (string)
   */
  async getAddressFromIndex(mnemonic: string, index = 0): Promise<string> {
    const i = this.assertIndex(index);
    const clean = mnemonic.trim().replace(/\s+/g, ' '); // normaliza espacios

    // ⚠️ IMPORTANTe: misma derivación que usas para firmar
    // fromPhrase(v6) + derivePath("0/{i}")  => consistente con tus signers actuales
    const node = ethers.HDNodeWallet.fromPhrase(clean).derivePath(`0/${i}`);

    return node.address.toLowerCase();
  }

  /**
   * Despliega el contrato BatchSpender.
   *
   * @param indexDeployer Índice HD que firmará el deploy (cuenta con fondos)
   * @param mnemonic Frase mnemotécnica
   * @param rpcUrl RPC de la red destino
   * @param admin Dirección admin (DEFAULT_ADMIN_ROLE). Si viene en '' o 0x0 => error.
   * @param operator Dirección con OPERATOR_ROLE inicial (puede ser 0x0 si no quieres setearla en el constructor)
   * @param artifact (opcional) artefacto { abi, bytecode } del contrato compilado (Hardhat/Foundry)
   * @returns { address, receipt }
   */
  async deployBatchSpender(
    indexDeployer: number,
    mnemonic: string,
    rpcUrl: string,
    admin: string,
    operator: string,
    artifact?: { abi: any; bytecode: string },
  ): Promise<{ address: string; receipt: TransactionReceipt }> {
    const provider = this.getProvider(rpcUrl);
    const signer = this.getSignerFromMnemonicMaster(mnemonic, provider);
    const feeOpts = await this.pickFeeOpts(provider);

    const adminNorm = this.norm(admin);
    const operatorNorm = this.norm(operator);

    if (
      !adminNorm ||
      adminNorm === '0x0000000000000000000000000000000000000000'
    ) {
      throw new BadRequestException('admin inválido');
    }
    // operator puede ser 0x0 (el constructor lo acepta), pero validamos formato si viene
    if (!operatorNorm) {
      throw new BadRequestException(
        'operator inválido (usa 0x000...0 si no deseas setearlo)',
      );
    }

    // Usa el artefacto pasado o un BYTECODE embebido (si decides mantenerlo en el archivo)
    const abiForFactory = artifact?.abi ?? BATCH_SPENDER_DEPLOY_ABI;
    const bytecodeForFactory = artifact?.bytecode; // <-- define este const si no pasas artifact

    if (!bytecodeForFactory || !bytecodeForFactory.startsWith('0x')) {
      throw new BadRequestException(
        'bytecode ausente o inválido para BatchSpender',
      );
    }

    // Crear la factory y desplegar
    const factory = new ethers.ContractFactory(
      abiForFactory,
      bytecodeForFactory,
      signer,
    );
    const contract = await factory.deploy(adminNorm, operatorNorm, {
      ...feeOpts,
    });

    const depTx = contract.deploymentTransaction();
    if (!depTx) {
      throw new NotFoundException('No deployment transaction available');
    }

    const receipt = await depTx.wait();
    if (!receipt?.contractAddress) {
      // Fallback: ethers v6 también permite waitForDeployment + getAddress
      await contract.waitForDeployment();
    }

    const address = await contract.getAddress();
    return { address, receipt: receipt! };
  }
}
