import { CurrenciesService } from '@/modules/currencies/currencies.service';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';

@Injectable()
export class PriceScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PriceScheduler.name);

  private isRunning = false;
  private lastSkipWarnAt = 0;

  private readonly CRON_JOB_NAME = 'price-update-cron';
  private readonly TIMEOUT_NAME = 'price-update-timeout';

  private intervalSeconds = 43200; // 12h por defecto

  constructor(
    private readonly currenciesService: CurrenciesService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap() {
    this.intervalSeconds = this.parseIntervalEnv(
      this.configService.get<string>('PRICE_UPDATE_INTERVAL_SECONDS'),
    );

    const cronExpr = this.buildCronExpression(this.intervalSeconds);

    if (cronExpr) {
      try {
        if (this.schedulerRegistry.doesExist('cron', this.CRON_JOB_NAME)) {
          const job = this.schedulerRegistry.getCronJob(this.CRON_JOB_NAME);
          job.setTime(new CronTime(cronExpr));
          job.start();
        } else {
          const job = new CronJob(
            cronExpr,
            async () => {
              await this.runUpdate();
            },
            undefined,
            false,
            'UTC',
          );
          this.schedulerRegistry.addCronJob(this.CRON_JOB_NAME, job);
          job.start();
        }
        this.logger.log(
          `Programada actualización de precios con Cron='${cronExpr}' (cada ${this.intervalSeconds}s)`,
        );
      } catch (e) {
        const msg = (e as Error)?.message ?? 'error desconocido';
        this.logger.error(
          `Fallo al configurar el Cron dinámico: ${msg}. Usando timeout alineado.`,
        );
        this.scheduleNextAlignedTimeout();
      }
    } else {
      this.logger.log(
        `Intervalo=${this.intervalSeconds}s no expresable con cron estándar. Usando timeout alineado al múltiplo exacto.`,
      );
      this.scheduleNextAlignedTimeout();
    }
  }

  onModuleDestroy() {
    if (this.schedulerRegistry.doesExist('cron', this.CRON_JOB_NAME)) {
      void this.schedulerRegistry.getCronJob(this.CRON_JOB_NAME).stop();
    }
    if (this.schedulerRegistry.doesExist('timeout', this.TIMEOUT_NAME)) {
      this.schedulerRegistry.deleteTimeout(this.TIMEOUT_NAME);
    }
  }

  // Declarado con Cron pero deshabilitado inicialmente; se reconfigura en onApplicationBootstrap
  @Cron('0 * * * * *', {
    name: 'price-update-cron',
    timeZone: 'UTC',
    disabled: true,
  })
  async handleCronTick() {
    await this.runUpdate();
  }

  private scheduleNextAlignedTimeout() {
    if (this.schedulerRegistry.doesExist('timeout', this.TIMEOUT_NAME)) {
      this.schedulerRegistry.deleteTimeout(this.TIMEOUT_NAME);
    }
    const nowMs = Date.now();
    const intervalMs = this.intervalSeconds * 1000;
    const nextTickMs = Math.ceil(nowMs / intervalMs) * intervalMs; // siguiente múltiplo exacto
    const delay = Math.max(0, nextTickMs - nowMs);
    const timeout = setTimeout(() => {
      void this.runUpdate().finally(() => {
        // reprogramar hacia el próximo múltiplo exacto en cada ciclo
        this.scheduleNextAlignedTimeout();
      });
    }, delay);
    this.schedulerRegistry.addTimeout(this.TIMEOUT_NAME, timeout);
  }

  private async runUpdate() {
    if (this.isRunning) {
      // Evitar spam de logs cuando hay solapamiento
      const now = Date.now();
      const throttleMs = Math.max(
        30_000,
        Math.min(300_000, this.intervalSeconds * 1000),
      );
      if (now - this.lastSkipWarnAt >= throttleMs) {
        this.logger.warn(
          'La actualización de precios anterior aún se está ejecutando. Omitiendo esta ejecución...',
        );
        this.lastSkipWarnAt = now;
      }
      return;
    }

    this.isRunning = true;
    this.logger.log('Iniciando actualización de precios...');
    try {
      await this.currenciesService.getPrices();
      this.logger.log('Actualización de precios completada exitosamente');
    } catch (error) {
      this.logger.error(
        `Error al actualizar precios: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private buildCronExpression(seconds: number): string | null {
    // Representaciones exactas para evitar ticks innecesarios
    if (seconds >= 1 && seconds < 60) {
      return `*/${seconds} * * * * *`; // cada N segundos
    }
    if (seconds % 86_400 === 0) {
      const d = seconds / 86_400;
      return `0 0 0 */${d} * *`; // cada d días (00:00:00 UTC)
    }
    if (seconds % 3_600 === 0) {
      const h = seconds / 3_600;
      return `0 0 */${h} * * *`; // cada h horas
    }
    if (seconds % 60 === 0) {
      const m = seconds / 60;
      return `0 */${m} * * * *`; // cada m minutos
    }
    return null; // no representable limpiamente con cron estándar
  }

  private parseIntervalEnv(value?: string): number {
    // Acepta enteros en segundos o sufijos: s, m, h, d (e.g., '45s', '5m', '2h', '1d')
    const fallback = 43200; // 12h
    if (!value) return fallback;
    const trimmed = String(value).trim();
    const m = /^\s*(\d+)\s*([smhdSMHD]?)\s*$/.exec(trimmed);
    if (!m) return fallback;
    const num = Number(m[1]);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    const unit = (m[2] || 's').toLowerCase();
    switch (unit) {
      case 's':
        return Math.floor(num);
      case 'm':
        return Math.floor(num * 60);
      case 'h':
        return Math.floor(num * 3600);
      case 'd':
        return Math.floor(num * 86400);
      default:
        return fallback;
    }
  }
}
