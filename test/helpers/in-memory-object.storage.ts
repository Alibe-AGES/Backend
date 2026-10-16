import {
  ObjectStorage,
  type SaveObjectInput,
  type StoredObject,
} from '../../src/shared/storage/object-storage';

export class InMemoryObjectStorage extends ObjectStorage {
  private readonly objects = new Map<string, StoredObject>();

  save(input: SaveObjectInput): Promise<void> {
    this.objects.set(input.key, {
      bytes: input.bytes,
      contentType: input.contentType,
    });
    return Promise.resolve();
  }

  findByKey(key: string): Promise<StoredObject | null> {
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  has(key: string): boolean {
    return this.objects.has(key);
  }
}
