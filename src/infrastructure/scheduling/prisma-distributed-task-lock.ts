import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DistributedTaskLock,
  type DistributedTaskExecution,
} from '../../shared/scheduling/distributed-task-lock';

const LOCK_NAMESPACE = 'alibe-scheduled-tasks';
const LOCK_TRANSACTION_TIMEOUT_MS = 60_000;

@Injectable()
export class PrismaDistributedTaskLock extends DistributedTaskLock {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async runExclusive<T>(key: string, task: () => Promise<T>): Promise<DistributedTaskExecution<T>> {
    return this.prisma.$transaction(
      async (transaction) => {
        const [lock] = await transaction.$queryRaw<Array<{ acquired: boolean }>>`
          SELECT pg_try_advisory_xact_lock(
            hashtext(${LOCK_NAMESPACE}),
            hashtext(${key})
          ) AS acquired
        `;

        if (!lock?.acquired) {
          return { acquired: false };
        }

        return { acquired: true, result: await task() };
      },
      { timeout: LOCK_TRANSACTION_TIMEOUT_MS }
    );
  }
}
