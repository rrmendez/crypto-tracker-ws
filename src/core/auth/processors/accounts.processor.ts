import { WalletsService } from '@/modules/wallets/wallets.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

interface CreateWalletsJob {
  userId: string;
}

@Processor('accounts')
export class AccountsProcessor extends WorkerHost {
  constructor(private readonly walletsService: WalletsService) {
    super();
  }

  async process(job: Job<CreateWalletsJob>): Promise<void> {
    switch (job.name) {
      case 'createWallets':
        await this.handleCreateWalletsByUser(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Create wallets for a user.
   *
   * @param job
   */
  async handleCreateWalletsByUser(job: Job<CreateWalletsJob>): Promise<void> {
    const { userId } = job.data;

    console.log(
      '*** Initializing AccountsProcessor / handleCreateWalletsByUser ***',
    );
    console.log('Creating wallets for userId: ', userId);

    const result = await this.walletsService.createWalletsForUser(userId);

    console.log('Quantity of wallets created: ', result.length);
    console.log(
      '*** Finished AccountsProcessor / handleCreateWalletsByUser ***',
    );
  }
}
