import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityModule } from '../../../../src/modules/availability/availability.module';
import { AvailabilityController } from '../../../../src/modules/availability/http/availability.controller';

describe('AvailabilityModule integration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AvailabilityModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('registers the mock availability controller without application providers', () => {
    expect(module.get(AvailabilityController)).toBeInstanceOf(AvailabilityController);
  });
});
