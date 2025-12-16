import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { CurrenciesService } from '@/modules/currencies/currencies.service';

@Processor('price-sync')
@Injectable()
export class PriceSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(PriceSyncProcessor.name);

  constructor(private readonly currenciesService: CurrenciesService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name !== 'sync-currency-price') return;

    const { currencyId } = job.data as {
      currencyId: string;
    };

    if (!currencyId) {
      throw new Error(
        `Job data invalido: currencyId debe ser una cadena no vacia, recibido: ${currencyId}`,
      );
    }

    try {
      this.logger.log(
        `Iniciando sincronización de precio para currency: ${currencyId}`,
      );
      const result = await this.currenciesService.syncPrice(currencyId);
      this.logger.log(
        `Precio sincronizado exitosamente para currency: ${currencyId}`,
      );
      return { ok: true, result };
    } catch (error) {
      this.logger.error(
        `Error al sincronizar precio para currency ${currencyId}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
