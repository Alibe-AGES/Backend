import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaGroupRepository } from '../../../../src/modules/groups/persistence/group.prisma.repository';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('Group ownership with PostgreSQL', () => {
  let prisma: PrismaService;
  let groups: PrismaGroupRepository;
  let pool: Pool;
  const users = [randomUUID(), randomUUID(), randomUUID()];
  const groupIds: string[] = [];
  const createGroup = async (members = users) => {
    const group = await groups.create({
      id: randomUUID(),
      name: 'Grupo teste',
      profilePic: null,
      createdAt: new Date(),
      creatorId: members[0],
    });
    groupIds.push(group.id);
    for (const userId of members.slice(1)) await groups.addMember(group.id, userId);
    return group;
  };

  beforeAll(async () => {
    const url = new URL(testDatabaseUrl);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) {
      throw new Error('TEST_DATABASE_URL must point to a local database ending in _test');
    }
    const previousUrl = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = testDatabaseUrl;
      prisma = new PrismaService();
    } finally {
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    }
    await prisma.$connect();
    groups = new PrismaGroupRepository(prisma);
    pool = new Pool({ connectionString: testDatabaseUrl });
    await prisma.user.createMany({
      data: users.map((id) => ({ id, name: 'Teste', email: `${id}@example.test` })),
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.userGroup.deleteMany({ where: { groupId: { in: groupIds } } });
      await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
    await pool?.end();
  });

  it('records the creator as owner and rejects edits/removals from other members', async () => {
    const group = await createGroup();
    expect((await groups.findManagementState(group.id)).ownerId).toBe(users[0]);
    await expect(
      groups.updateOwned(group.id, users[1], { name: 'Não autorizado' })
    ).rejects.toMatchObject({ reason: 'forbidden' });
    await expect(groups.removeMember(group.id, users[2], users[1])).rejects.toMatchObject({
      reason: 'forbidden',
    });
    await groups.updateOwned(group.id, users[0], {
      name: 'Atualizado',
      profilePic: 'groups/new.png',
    });
    const updated = await groups.updateOwned(group.id, users[0], { profilePic: null });
    expect(updated.previousImageKey).toBe('groups/new.png');
    expect(updated.group.name).toBe('Atualizado');
    expect(updated.group.profilePic).toBeNull();
  });

  it('preserves other groups and the owner when removing an ordinary member', async () => {
    const group = await createGroup();
    const other = await createGroup();
    expect(await groups.removeMember(group.id, users[1], users[0])).toBe(true);
    expect(await groups.findMembership(group.id, users[1])).toBe(false);
    expect(await groups.findMembership(other.id, users[1])).toBe(true);
    expect((await groups.findManagementState(group.id)).ownerId).toBe(users[0]);
    expect(await groups.removeMember(group.id, users[1], users[0])).toBe(false);
  });

  it('selects one remaining member on owner exit and revokes the previous owner permission', async () => {
    const group = await createGroup();
    await groups.removeMember(group.id, users[0], users[0]);
    const { ownerId } = await groups.findManagementState(group.id);
    expect(users.slice(1)).toContain(ownerId);
    expect(await groups.findMembership(group.id, users[0])).toBe(false);
    await expect(
      groups.updateOwned(group.id, users[0], { name: 'Bloqueado' })
    ).rejects.toMatchObject({ reason: 'forbidden' });
    await expect(
      groups.updateOwned(group.id, ownerId, { name: 'Novo owner' })
    ).resolves.toBeDefined();
  });

  it('keeps an empty group with null owner and handles self-removal through the shared leave method', async () => {
    const group = await createGroup([users[0]]);
    expect(await groups.removeMember(group.id, users[0])).toBe(true);
    expect(await groups.findById(group.id)).not.toBeNull();
    expect((await groups.findManagementState(group.id)).ownerId).toBeNull();
    expect(await groups.removeMember(group.id, users[0])).toBe(false);
    await groups.addMember(group.id, users[1]);
    expect((await groups.findManagementState(group.id)).ownerId).toBe(users[1]);
  });

  it('serializes simultaneous owner exits and joins without retaining a departed owner', async () => {
    const group = await createGroup([users[0]]);
    await Promise.all([
      groups.removeMember(group.id, users[0]),
      groups.addMember(group.id, users[1]),
    ]);
    expect((await groups.findManagementState(group.id)).ownerId).toBe(users[1]);
    const exits = await Promise.all([
      groups.removeMember(group.id, users[1]),
      groups.removeMember(group.id, users[1]),
    ]);
    expect(exits.sort()).toEqual([false, true]);
    expect((await groups.findManagementState(group.id)).ownerId).toBeNull();
  });

  it('rolls back membership removal if reassignment cannot be persisted', async () => {
    const group = await createGroup();
    await pool.query(`
      CREATE FUNCTION alibe49_fail_owner_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Owner update failed'; END; $$;
      CREATE TRIGGER alibe49_fail_owner_update BEFORE UPDATE OF owner_id ON "group"
      FOR EACH ROW EXECUTE FUNCTION alibe49_fail_owner_update();
    `);
    try {
      await expect(groups.removeMember(group.id, users[0])).rejects.toThrow('Owner update failed');
    } finally {
      await pool.query(
        'DROP TRIGGER alibe49_fail_owner_update ON "group"; DROP FUNCTION alibe49_fail_owner_update();'
      );
    }
    expect(await groups.findMembership(group.id, users[0])).toBe(true);
    expect((await groups.findManagementState(group.id)).ownerId).toBe(users[0]);
  });

  it('backfills existing groups with a member and leaves empty groups ownerless', async () => {
    const populated = await createGroup();
    const emptyId = randomUUID();
    groupIds.push(emptyId);
    await prisma.group.create({ data: { id: emptyId, name: 'Vazio', createdAt: new Date() } });
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      await connection.query('ALTER TABLE "group" DROP COLUMN "owner_id" CASCADE');
      const migration = readFileSync(
        resolve('prisma/migrations/20261106180000_add_group_owner/migration.sql'),
        'utf8'
      );
      await connection.query(migration);
      const { rows } = await connection.query(
        'SELECT id, owner_id FROM "group" WHERE id = ANY($1::uuid[])',
        [[populated.id, emptyId]]
      );
      expect(users).toContain(rows.find((row) => row.id === populated.id).owner_id);
      expect(rows.find((row) => row.id === emptyId).owner_id).toBeNull();
    } finally {
      await connection.query('ROLLBACK');
      connection.release();
    }
  });
});
