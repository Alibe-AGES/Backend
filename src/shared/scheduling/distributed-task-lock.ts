export type DistributedTaskExecution<T> = { acquired: false } | { acquired: true; result: T };

export abstract class DistributedTaskLock {
  abstract runExclusive<T>(
    key: string,
    task: () => Promise<T>
  ): Promise<DistributedTaskExecution<T>>;
}
