import { Test, TestingModule } from '@nestjs/testing';
import { CalendarModule } from '../../../../src/modules/calendar/calendar.module';
import { CalendarController } from '../../../../src/modules/calendar/http/calendar.controller';

describe('CalendarModule integration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CalendarModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('registers the mock calendar controller without application providers', () => {
    expect(module.get(CalendarController)).toBeInstanceOf(CalendarController);
  });
});
