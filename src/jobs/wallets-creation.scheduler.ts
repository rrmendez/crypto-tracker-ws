import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { REPOSITORY } from '@/database/constants';
import { User } from '@/modules/users/entities/user.entity';
import { RoleEnum } from '@/common/enums/role.enum';

@Injectable()
export class WalletsCreationScheduler {
  private readonly logger = new Logger(WalletsCreationScheduler.name);

  constructor(
    @InjectQueue('accounts') private readonly accountsQ: Queue,
    @Inject(REPOSITORY.USERS)
    private readonly usersRepository: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'UTC' })
  async enqueueMissingWalletsForAllUsers(): Promise<void> {
    const pageSize = 500;
    let page = 0;
    let totalEnqueued = 0;
    // build a date-based suffix for deduplication per day
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    this.logger.log('Starting wallets creation enqueue (UTC midnight)');

    // loop pages until no users are returned
    try {
      while (true) {
        const users = await this.usersRepository
          .createQueryBuilder('u')
          .innerJoin('u.roles', 'r')
          .where('r.name IN (:...roles)', {
            roles: [RoleEnum.USER, RoleEnum.MERCHANT],
          })
          .select(['u.id'])
          .distinct(true)
          .orderBy('u.id', 'ASC')
          .skip(page * pageSize)
          .take(pageSize)
          .getMany();

        if (!users.length) break;

        const jobs = users.map((u) => ({
          name: 'createWallets',
          data: { userId: u.id },
          opts: {
            removeOnComplete: true,
            removeOnFail: 100,
            jobId: `createWallets:${u.id}:${today}`,
          },
        }));

        // optional chunking for very large batches
        const chunkSize = 200;
        for (let i = 0; i < jobs.length; i += chunkSize) {
          const chunk = jobs.slice(i, i + chunkSize);
          try {
            await this.accountsQ.addBulk(chunk);
            totalEnqueued += chunk.length;
          } catch (error) {
            const msg = (error as Error)?.message || 'unknown error';
            this.logger.error(
              `Bulk enqueue failed at page=${page}, chunk=${i}-${
                i + chunk.length - 1
              }: ${msg}. Falling back to per-user adds`,
            );
            for (const job of chunk) {
              try {
                await this.accountsQ.add(job.name, job.data, job.opts);
                totalEnqueued += 1;
              } catch (e) {
                const em = (e as Error)?.message || 'unknown error';
                // include user id in the log
                this.logger.error(
                  `Failed to enqueue userId=${(job.data as { userId: string }).userId}: ${em}`,
                );
              }
            }
          }
        }

        this.logger.log(
          `Enqueued batch page=${page} size=${users.length}. Total so far: ${totalEnqueued}`,
        );

        page += 1;
      }
    } catch (error) {
      const msg = (error as Error)?.message || 'unknown error';
      this.logger.error(
        `Fatal error enqueuing wallets at page=${page}: ${msg}`,
      );
      throw error;
    }

    this.logger.log(
      `Finished wallets creation enqueue. Total jobs enqueued: ${totalEnqueued}`,
    );
  }
}
