import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaDistributedTaskLock } from '../../../../src/infrastructure/scheduling/prisma-distributed-task-lock';

describe('PrismaDistributedTaskLock', () => {
  it('executes the task when PostgreSQL grants the advisory lock', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ acquired: true }]);
    const transaction = jest.fn(async (callback) => callback({ $queryRaw: queryRaw }));
    const lock = new PrismaDistributedTaskLock({
      $transaction: transaction,
    } as unknown as PrismaService);
    const task = jest.fn().mockResolvedValue('completed');

    await expect(lock.runExclusive('task-key', task)).resolves.toEqual({
      acquired: true,
      result: 'completed',
    });

    expect(task).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 60_000 });
  });

  it('does not execute the task when another replica holds the advisory lock', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ acquired: false }]);
    const transaction = jest.fn(async (callback) => callback({ $queryRaw: queryRaw }));
    const lock = new PrismaDistributedTaskLock({
      $transaction: transaction,
    } as unknown as PrismaService);
    const task = jest.fn();

    await expect(lock.runExclusive('task-key', task)).resolves.toEqual({ acquired: false });
    expect(task).not.toHaveBeenCalled();
  });

  it('propagates task failures so PostgreSQL rolls the transaction back and releases the lock', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ acquired: true }]);
    const transaction = jest.fn(async (callback) => callback({ $queryRaw: queryRaw }));
    const lock = new PrismaDistributedTaskLock({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(
      lock.runExclusive('task-key', async () => {
        throw new Error('queue unavailable');
      })
    ).rejects.toThrow('queue unavailable');
  });
});
