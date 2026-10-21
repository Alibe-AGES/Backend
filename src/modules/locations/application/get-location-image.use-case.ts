import { Injectable } from '@nestjs/common';
import { ObjectStorage, type StoredObject } from '../../../shared/storage/object-storage';
import { LocationRepository } from '../domain/location.repository';

export class LocationForImageNotFoundError extends Error {}
export class LocationImageAccessDeniedError extends Error {}
export class LocationImageNotFoundError extends Error {}

@Injectable()
export class GetLocationImageUseCase {
  constructor(
    private readonly locations: LocationRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(locationId: string, userId: string): Promise<StoredObject> {
    const access = await this.locations.findImageAccess(locationId, userId);
    if (!access) throw new LocationForImageNotFoundError('Local não encontrado');
    if (!access.userIsMember) {
      throw new LocationImageAccessDeniedError('O usuário não pertence ao grupo do local');
    }
    if (!access.imageKey) throw new LocationImageNotFoundError('Imagem do local não encontrada');

    const image = await this.storage.findByKey(access.imageKey);
    if (!image) throw new LocationImageNotFoundError('Imagem do local não encontrada');
    return image;
  }
}
