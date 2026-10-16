import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ProposalRepository } from '../../../../src/modules/proposals/domain/proposal.entity.repository';
import { InMemoryProposalRepository } from '../../../helpers/in-memory-proposal.repository';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = 'd719525b-3514-4d3b-aa36-d51299bac4ab';
const OUTSIDER_ID = '99999999-9999-4999-8999-999999999999';
const PROPOSALS_PATH = `/groups/${GROUP_ID}/proposals`;

describe('Group proposals endpoints (e2e)', () => {
  let app: INestApplication;
  let proposalsRepo: InMemoryProposalRepository;
  const previousMockAuthEnabled = process.env.MOCK_AUTH_ENABLED;
  const previousMockAuthUserId = process.env.MOCK_AUTH_USER_ID;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ProposalRepository)
      .useClass(InMemoryProposalRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    proposalsRepo = moduleFixture.get(ProposalRepository);
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    restoreEnvironment('MOCK_AUTH_ENABLED', previousMockAuthEnabled);
    restoreEnvironment('MOCK_AUTH_USER_ID', previousMockAuthUserId);
    await app.close();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    proposalsRepo.clear();

    proposalsRepo.setGroupData(
      GROUP_ID,
      [USER_ID],
      [
        {
          id: '41db784d-6167-4c7e-adf6-c54fc62557a2',
          createdAt: new Date('2026-08-25T00:00:00.000Z'),
          owner: {
            id: USER_ID,
            name: 'Ana Beatriz Silva',
            image: null,
          },
          event: {
            id: 'ed21e483-5181-4292-99fe-3e728f71b9aa',
            name: 'Jantar da turma',
            date: '2026-09-05',
            time: '23:00',
            image: null,
            budgetStart: '40',
            budgetEnd: '80',
            status: 'confirmed',
            groupId: GROUP_ID,
            location: null,
            proposal: null,
            createdAt: new Date('2026-08-10T00:00:00.000Z'),
            updatedAt: new Date('2026-10-16T20:01:11.174Z'),
          },
          location: {
            id: 'c7f4d94b-ad6c-4485-9e59-c8e20279bc56',
            description: 'Restaurante italiano com opções vegetarianas',
            manuallyCreated: false,
          },
          responses: {
            yes: 3,
            no: 1,
            pending: 2,
          },
          myAnswer: 'yes',
        },
        {
          id: 'a295b739-fefd-49cb-a253-dcaa5dd51cc5',
          createdAt: new Date('2026-08-25T00:00:00.000Z'),
          owner: {
            id: '44444444-4444-4444-8444-444444444444',
            name: 'Daniel Martins',
            image: null,
          },
          event: {
            id: 'ab631fb0-53c7-4147-986b-d93977bb61fd',
            name: 'Jantar de encerramento',
            date: '2026-10-03',
            time: '23:00',
            image: null,
            budgetStart: '60',
            budgetEnd: '120',
            status: 'pending',
            groupId: GROUP_ID,
            location: null,
            proposal: null,
            createdAt: new Date('2026-08-24T00:00:00.000Z'),
            updatedAt: new Date('2026-10-16T20:01:11.187Z'),
          },
          location: {
            id: 'c7f4d94b-ad6c-4485-9e59-c8e20279bc56',
            description: 'Restaurante italiano com opções vegetarianas',
            manuallyCreated: false,
          },
          responses: {
            yes: 2,
            no: 1,
            pending: 1,
          },
          myAnswer: 'pending',
        },
      ]
    );
  });

  it('returns empty array when the group has no active proposals', async () => {
    proposalsRepo.setGroupData(GROUP_ID, [USER_ID], []);

    const response = await request(app.getHttpServer()).get(PROPOSALS_PATH);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('rejects an invalid group id (not a uuid)', async () => {
    const response = await request(app.getHttpServer()).get('/groups/not-a-uuid/proposals');

    expect(response.status).toBe(400);
  });

  it('returns empty array when user outside the group tries to access', async () => {
    process.env.MOCK_AUTH_USER_ID = OUTSIDER_ID;

    const response = await request(app.getHttpServer()).get(PROPOSALS_PATH);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('rejects requests without an authenticated user', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    const response = await request(app.getHttpServer()).get(PROPOSALS_PATH);

    expect(response.status).toBe(401);
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
