export interface SaveObjectInput {
  key: string;
  bytes: Uint8Array;
  contentType: string;
}

export interface StoredObject {
  bytes: Uint8Array;
  contentType: string;
}

export abstract class ObjectStorage {
  abstract save(input: SaveObjectInput): Promise<void>;

  abstract findByKey(key: string): Promise<StoredObject | null>;

  abstract delete(key: string): Promise<void>;
}
