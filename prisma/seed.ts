import { AnswerEnum, PrismaClient, StatusEnum } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});
const PASSWORD_PLACEHOLDER = 'NOT_IMPLEMENTED';
const SEEDED_USER_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
] as const;

async function main() {
  console.log('Iniciando seed...');

  // ============================================================
  // 1. LIMPEZA
  // ============================================================
  //
  // A ordem importa por causa das foreign keys.
  //

  console.log('Limpando banco...');

  await prisma.folderLocation.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.proposalResponse.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.event.deleteMany();
  await prisma.inviteLink.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.mood.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.userGroup.deleteMany();
  await prisma.location.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
  await prisma.example.deleteMany();

  // ============================================================
  // 2. USUÁRIOS
  // ============================================================

  console.log('Criando usuários...');

  const usersData = [
    {
      name: 'Ana Beatriz Silva',
      email: 'ana.silva@example.com',
      birthDate: new Date('2005-03-18'),
    },
    {
      name: 'Bruno Henrique Souza',
      email: 'bruno.souza@example.com',
      birthDate: new Date('2004-07-25'),
    },
    {
      name: 'Camila Oliveira',
      email: 'camila.oliveira@example.com',
      birthDate: new Date('2006-01-12'),
    },
    {
      name: 'Daniel Martins',
      email: 'daniel.martins@example.com',
      birthDate: new Date('2003-11-09'),
    },
    {
      name: 'Eduarda Costa',
      email: 'eduarda.costa@example.com',
      birthDate: new Date('2005-09-21'),
    },
    {
      name: 'Felipe Almeida',
      email: 'felipe.almeida@example.com',
      birthDate: new Date('2004-05-14'),
    },
    {
      name: 'Gabriela Rodrigues',
      email: 'gabriela.rodrigues@example.com',
      birthDate: new Date('2006-08-03'),
    },
    {
      name: 'Gustavo Pereira',
      email: 'gustavo.pereira@example.com',
      birthDate: new Date('2003-12-17'),
    },
    {
      name: 'Helena Ferreira',
      email: 'helena.ferreira@example.com',
      birthDate: new Date('2005-02-28'),
    },
    {
      name: 'Isabela Ribeiro',
      email: 'isabela.ribeiro@example.com',
      birthDate: new Date('2004-10-06'),
    },
    {
      name: 'João Pedro Lima',
      email: 'joao.lima@example.com',
      birthDate: new Date('2005-06-30'),
    },
    {
      name: 'Larissa Mendes',
      email: 'larissa.mendes@example.com',
      birthDate: new Date('2006-04-11'),
    },
    {
      name: 'Lucas Carvalho',
      email: 'lucas.carvalho@example.com',
      birthDate: new Date('2003-08-19'),
    },
    {
      name: 'Mariana Gomes',
      email: 'mariana.gomes@example.com',
      birthDate: new Date('2005-12-02'),
    },
    {
      name: 'Rafael Teixeira',
      email: 'rafael.teixeira@example.com',
      birthDate: new Date('2004-03-27'),
    },
  ];

  const users = [];

  for (const [index, userData] of usersData.entries()) {
    const user = await prisma.user.create({
      data: {
        id: SEEDED_USER_IDS[index],
        ...userData,
        passwordHash: PASSWORD_PLACEHOLDER,
        profilePic: null,
      },
    });

    users.push(user);
  }

  // ============================================================
  // 3. GRUPOS
  // ============================================================

  console.log('Criando grupos...');

  const groupsData = [
    {
      name: 'Turma da Faculdade',
      createdAt: new Date('2026-07-12'),
    },
    {
      name: 'Amigos do Colégio',
      createdAt: new Date('2026-07-20'),
    },
    {
      name: 'Pessoal do Trabalho',
      createdAt: new Date('2026-08-01'),
    },
    {
      name: 'Rolês de Fim de Semana',
      createdAt: new Date('2026-08-08'),
    },
    {
      name: 'Galera do Cinema',
      createdAt: new Date('2026-08-15'),
    },
  ];

  const groups = [];

  for (const groupData of groupsData) {
    const group = await prisma.group.create({
      data: {
        ...groupData,
        profilePic: null,
      },
    });

    groups.push(group);
  }

  // ============================================================
  // 4. RELACIONAMENTO USUÁRIO x GRUPO
  // ============================================================

  console.log('Associando usuários aos grupos...');

  /*
   * Grupo 1 - Turma da Faculdade
   * Ana, Bruno, Camila, Daniel, Eduarda, Felipe, Gabriela
   */
  const groupMemberships = [
    // Turma da Faculdade
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
    [6, 0],

    // Amigos do Colégio
    [0, 1],
    [2, 1],
    [4, 1],
    [7, 1],
    [8, 1],
    [9, 1],

    // Pessoal do Trabalho
    [1, 2],
    [3, 2],
    [5, 2],
    [7, 2],
    [10, 2],
    [11, 2],

    // Rolês de Fim de Semana
    [0, 3],
    [4, 3],
    [6, 3],
    [8, 3],
    [10, 3],
    [12, 3],
    [13, 3],
    [14, 3],

    // Galera do Cinema
    [2, 4],
    [6, 4],
    [8, 4],
    [9, 4],
    [11, 4],
    [13, 4],
    [14, 4],
  ];

  for (const [userIndex, groupIndex] of groupMemberships) {
    await prisma.userGroup.create({
      data: {
        userId: users[userIndex].id,
        groupId: groups[groupIndex].id,
      },
    });
  }

  // ============================================================
  // 5. LOCATIONS
  // ============================================================

  console.log('Criando locais...');

  const locationsData = [
    {
      externalId: 'place-001',
      description: 'Café com ambiente tranquilo e mesas externas',
      address: 'Rua Padre Chagas, 320 - Moinhos de Vento, Porto Alegre - RS',
      manuallyCreated: false,
    },
    {
      externalId: 'place-002',
      description: 'Cinema com várias salas e praça de alimentação',
      address: 'Avenida Diário de Notícias, 300 - Cristal, Porto Alegre - RS',
      manuallyCreated: false,
    },
    {
      externalId: 'place-003',
      description: 'Parque com áreas para caminhada e piquenique',
      address: 'Avenida Borges de Medeiros, 2035 - Praia de Belas, Porto Alegre - RS',
      manuallyCreated: true,
    },
    {
      externalId: null,
      description: 'Casa do Bruno',
      address: 'Rua fictícia, 100 - Porto Alegre - RS',
      manuallyCreated: true,
    },
    {
      externalId: 'place-005',
      description: 'Restaurante italiano com opções vegetarianas',
      address: 'Rua Dinarte Ribeiro, 150 - Moinhos de Vento, Porto Alegre - RS',
      manuallyCreated: false,
    },
    {
      externalId: 'place-006',
      description: 'Boliche e espaço de jogos',
      address: 'Avenida Ipiranga, 5200 - Jardim Botânico, Porto Alegre - RS',
      manuallyCreated: false,
    },
    {
      externalId: null,
      description: 'Local sugerido pelos usuários',
      address: 'Endereço definido posteriormente',
      manuallyCreated: true,
    },
  ];

  const locations = [];

  for (const locationData of locationsData) {
    const location = await prisma.location.create({
      data: locationData,
    });

    locations.push(location);
  }

  // ============================================================
  // 6. EVENTS
  // ============================================================

  console.log('Criando eventos...');

  const eventsData = [
    {
      name: 'Jantar da turma',
      timeslot: new Date('2026-09-05T20:00:00'),
      budgetStart: '40.00',
      budgetEnd: '80.00',
      status: StatusEnum.confirmed,
      createdAt: new Date('2026-08-10'),
      groupIndex: 0,
      locationIndex: 4,
    },
    {
      name: 'Sessão de cinema',
      timeslot: new Date('2026-09-12T19:30:00'),
      budgetStart: '30.00',
      budgetEnd: '60.00',
      status: StatusEnum.pending,
      createdAt: new Date('2026-08-18'),
      groupIndex: 4,
      locationIndex: 1,
    },
    {
      name: 'Piquenique no parque',
      timeslot: new Date('2026-09-06T15:00:00'),
      budgetStart: '15.00',
      budgetEnd: '40.00',
      status: StatusEnum.confirmed,
      createdAt: new Date('2026-08-12'),
      groupIndex: 3,
      locationIndex: 2,
    },
    {
      name: 'Noite de jogos',
      timeslot: new Date('2026-09-19T18:00:00'),
      budgetStart: '50.00',
      budgetEnd: '100.00',
      status: StatusEnum.pending,
      createdAt: new Date('2026-08-21'),
      groupIndex: 2,
      locationIndex: 5,
    },
    {
      name: 'Café de domingo',
      timeslot: new Date('2026-09-27T16:00:00'),
      budgetStart: '20.00',
      budgetEnd: '45.00',
      status: StatusEnum.declined,
      createdAt: new Date('2026-08-05'),
      groupIndex: 1,
      locationIndex: 0,
    },
    {
      name: 'Jantar de encerramento',
      timeslot: new Date('2026-10-03T20:00:00'),
      budgetStart: '60.00',
      budgetEnd: '120.00',
      status: StatusEnum.pending,
      createdAt: new Date('2026-08-24'),
      groupIndex: 0,
      locationIndex: 4,
    },
  ];

  const events = [];

  for (const eventData of eventsData) {
    const event = await prisma.event.create({
      data: {
        name: eventData.name,
        timeslot: eventData.timeslot,
        budgetStart: eventData.budgetStart,
        budgetEnd: eventData.budgetEnd,
        status: eventData.status,
        createdAt: eventData.createdAt,
        groupId: groups[eventData.groupIndex].id,
        locationId: locations[eventData.locationIndex].id,
      },
    });

    events.push(event);
  }

  // ============================================================
  // 7. MEMORIES
  // ============================================================

  console.log('Criando memories...');

  const memoriesData = [
    {
      picture: 'https://example.com/memories/jantar-turma.jpg',
      eventIndex: 0,
    },
    {
      picture: 'https://example.com/memories/piquenique.jpg',
      eventIndex: 2,
    },
    {
      picture: null,
      eventIndex: 4,
    },
    {
      picture: 'https://example.com/memories/noite-jogos.jpg',
      eventIndex: 3,
    },
  ];

  for (const memoryData of memoriesData) {
    await prisma.memory.create({
      data: {
        picture: memoryData.picture,
        eventId: events[memoryData.eventIndex].id,
      },
    });
  }

  // ============================================================
  // 8. MOODS
  // ============================================================

  console.log('Criando moods...');

  const moodsData = [
    [0, 0, 8, '2026-08-20'],
    [1, 0, 7, '2026-08-20'],
    [2, 0, 9, '2026-08-20'],
    [3, 0, 6, '2026-08-21'],
    [4, 0, 8, '2026-08-21'],
    [5, 0, 7, '2026-08-22'],
    [6, 0, 9, '2026-08-22'],

    [0, 1, 7, '2026-08-23'],
    [2, 1, 8, '2026-08-23'],
    [4, 1, 6, '2026-08-24'],
    [7, 1, 9, '2026-08-24'],
    [8, 1, 8, '2026-08-25'],
    [9, 1, 7, '2026-08-25'],

    [1, 2, 5, '2026-08-26'],
    [3, 2, 7, '2026-08-26'],
    [5, 2, 6, '2026-08-27'],
    [7, 2, 8, '2026-08-27'],
    [10, 2, 7, '2026-08-28'],
    [11, 2, 9, '2026-08-28'],

    [0, 3, 9, '2026-08-29'],
    [4, 3, 8, '2026-08-29'],
    [6, 3, 7, '2026-08-30'],
    [8, 3, 9, '2026-08-30'],
    [10, 3, 6, '2026-08-30'],
    [12, 3, 8, '2026-08-31'],

    [2, 4, 7, '2026-08-28'],
    [6, 4, 9, '2026-08-28'],
    [8, 4, 8, '2026-08-29'],
    [9, 4, 6, '2026-08-29'],
  ];

  for (const [userIndex, groupIndex, humorScale, date] of moodsData) {
    await prisma.mood.create({
      data: {
        userId: users[userIndex].id,
        groupId: groups[groupIndex].id,
        humorScale: humorScale as number,
        date: new Date(date as string),
      },
    });
  }

  // ============================================================
  // 9. PROPOSALS
  // ============================================================

  console.log('Criando propostas...');

  const proposalsData = [
    { eventIndex: 0, ownerIndex: 0 },
    { eventIndex: 0, ownerIndex: 2 },
    { eventIndex: 1, ownerIndex: 6 },
    { eventIndex: 2, ownerIndex: 12 },
    { eventIndex: 3, ownerIndex: 1 },
    { eventIndex: 4, ownerIndex: 7 },
    { eventIndex: 5, ownerIndex: 3 },
  ];

  const proposals = [];

  for (const proposalData of proposalsData) {
    const proposal = await prisma.proposal.create({
      data: {
        eventId: events[proposalData.eventIndex].id,
        ownerId: users[proposalData.ownerIndex].id,
        createdAt: new Date('2026-08-25'),
      },
    });

    proposals.push(proposal);
  }

  // ============================================================
  // 10. PROPOSAL RESPONSES
  // ============================================================

  console.log('Criando respostas às propostas...');

  /*
   * As respostas são escolhidas de acordo com os membros
   * dos grupos relacionados aos respectivos eventos.
   *
   * Também evitamos duplicar a combinação proposalId + userId.
   */

  const proposalResponses = [
    // Proposal 0 -> Event 0 -> Grupo Faculdade
    [0, 1, AnswerEnum.yes],
    [0, 2, AnswerEnum.yes],
    [0, 3, AnswerEnum.pending],
    [0, 4, AnswerEnum.no],

    // Proposal 1 -> Event 0
    [1, 0, AnswerEnum.yes],
    [1, 1, AnswerEnum.yes],
    [1, 5, AnswerEnum.pending],

    // Proposal 2 -> Event 1 -> Grupo Cinema
    [2, 2, AnswerEnum.yes],
    [2, 6, AnswerEnum.yes],
    [2, 8, AnswerEnum.no],
    [2, 9, AnswerEnum.pending],

    // Proposal 3 -> Event 2 -> Rolês
    [3, 0, AnswerEnum.yes],
    [3, 4, AnswerEnum.yes],
    [3, 6, AnswerEnum.pending],
    [3, 10, AnswerEnum.no],

    // Proposal 4 -> Event 3 -> Trabalho
    [4, 1, AnswerEnum.yes],
    [4, 3, AnswerEnum.pending],
    [4, 5, AnswerEnum.no],
    [4, 7, AnswerEnum.yes],

    // Proposal 5 -> Event 4 -> Colégio
    [5, 0, AnswerEnum.no],
    [5, 2, AnswerEnum.yes],
    [5, 7, AnswerEnum.pending],
    [5, 8, AnswerEnum.yes],

    // Proposal 6 -> Event 5 -> Faculdade
    [6, 0, AnswerEnum.pending],
    [6, 1, AnswerEnum.yes],
    [6, 4, AnswerEnum.no],
    [6, 6, AnswerEnum.yes],
  ];

  for (const [proposalIndex, userIndex, answer] of proposalResponses) {
    await prisma.proposalResponse.create({
      data: {
        proposalId: proposals[proposalIndex].id,
        userId: users[userIndex].id,
        answer: answer as AnswerEnum,
        createdAt: new Date('2026-08-27'),
      },
    });
  }

  // ============================================================
  // 11. AVAILABILITIES
  // ============================================================

  console.log('Criando disponibilidades...');

  const availabilitiesData = [
    // Faculdade
    [0, 0, '2026-09-05T14:00:00', '2026-09-05T20:00:00'],
    [1, 0, '2026-09-05T18:00:00', '2026-09-05T22:00:00'],
    [2, 0, '2026-09-05T14:00:00', '2026-09-05T19:00:00'],
    [3, 0, '2026-09-06T10:00:00', '2026-09-06T18:00:00'],
    [4, 0, '2026-09-05T19:00:00', '2026-09-05T23:00:00'],
    [5, 0, '2026-09-06T14:00:00', '2026-09-06T20:00:00'],

    // Colégio
    [0, 1, '2026-09-06T12:00:00', '2026-09-06T20:00:00'],
    [2, 1, '2026-09-06T15:00:00', '2026-09-06T22:00:00'],
    [4, 1, '2026-09-06T13:00:00', '2026-09-06T18:00:00'],
    [7, 1, '2026-09-06T16:00:00', '2026-09-06T21:00:00'],
    [8, 1, '2026-09-07T18:00:00', '2026-09-07T22:00:00'],

    // Trabalho
    [1, 2, '2026-09-19T17:00:00', '2026-09-19T22:00:00'],
    [3, 2, '2026-09-19T18:00:00', '2026-09-19T23:00:00'],
    [5, 2, '2026-09-19T14:00:00', '2026-09-19T20:00:00'],
    [7, 2, '2026-09-20T10:00:00', '2026-09-20T18:00:00'],
    [10, 2, '2026-09-19T19:00:00', '2026-09-19T23:00:00'],

    // Rolês
    [0, 3, '2026-09-06T14:00:00', '2026-09-06T20:00:00'],
    [4, 3, '2026-09-06T15:00:00', '2026-09-06T19:00:00'],
    [6, 3, '2026-09-06T13:00:00', '2026-09-06T21:00:00'],
    [8, 3, '2026-09-06T16:00:00', '2026-09-06T22:00:00'],
    [10, 3, '2026-09-06T14:00:00', '2026-09-06T18:00:00'],
    [12, 3, '2026-09-06T17:00:00', '2026-09-06T23:00:00'],

    // Cinema
    [2, 4, '2026-09-12T18:00:00', '2026-09-12T23:00:00'],
    [6, 4, '2026-09-12T17:00:00', '2026-09-12T22:00:00'],
    [8, 4, '2026-09-12T19:00:00', '2026-09-12T23:00:00'],
    [9, 4, '2026-09-13T14:00:00', '2026-09-13T20:00:00'],
  ];

  for (const [userIndex, groupIndex, timeslotStart, timeslotEnd] of availabilitiesData) {
    await prisma.availability.create({
      data: {
        userId: users[userIndex].id,
        groupId: groups[groupIndex].id,
        timeslotStart: new Date(timeslotStart as string),
        timeslotEnd: new Date(timeslotEnd as string),
      },
    });
  }

  // ============================================================
  // 12. INVITE LINKS
  // ============================================================

  console.log('Criando links de convite...');

  const inviteLinksData = [
    {
      groupIndex: 0,
      validity: new Date('2026-09-30'),
      createdAt: new Date('2026-08-20'),
    },
    {
      groupIndex: 1,
      validity: new Date('2026-09-15'),
      createdAt: new Date('2026-08-18'),
    },
    {
      groupIndex: 2,
      validity: new Date('2026-10-01'),
      createdAt: new Date('2026-08-22'),
    },
    {
      groupIndex: 3,
      validity: new Date('2026-09-10'),
      createdAt: new Date('2026-08-10'),
    },
    {
      groupIndex: 4,
      validity: new Date('2026-09-25'),
      createdAt: new Date('2026-08-24'),
    },
    {
      groupIndex: 1,
      validity: new Date('2026-08-25'),
      createdAt: new Date('2026-08-01'),
    },
  ];

  for (const inviteLinkData of inviteLinksData) {
    await prisma.inviteLink.create({
      data: {
        groupId: groups[inviteLinkData.groupIndex].id,
        validity: inviteLinkData.validity,
        createdAt: inviteLinkData.createdAt,
      },
    });
  }

  // ============================================================
  // 13. FOLDERS
  // ============================================================

  console.log('Criando pastas...');

  const foldersData = [
    {
      name: 'Restaurantes favoritos',
      userIndex: 0,
      groupIndex: 0,
    },
    {
      name: 'Lugares para conhecer',
      userIndex: 2,
      groupIndex: 1,
    },
    {
      name: 'Programas baratos',
      userIndex: 5,
      groupIndex: 2,
    },
    {
      name: 'Ideias para o fim de semana',
      userIndex: 8,
      groupIndex: 3,
    },
    {
      name: 'Cinemas e filmes',
      userIndex: 6,
      groupIndex: 4,
    },
    {
      name: 'Comida italiana',
      userIndex: 4,
      groupIndex: 0,
    },
    {
      name: 'Passeios ao ar livre',
      userIndex: 12,
      groupIndex: 3,
    },
  ];

  const folders = [];

  for (const folderData of foldersData) {
    const folder = await prisma.folder.create({
      data: {
        name: folderData.name,
        userId: users[folderData.userIndex].id,
        groupId: groups[folderData.groupIndex].id,
      },
    });

    folders.push(folder);
  }

  // ============================================================
  // 14. FOLDER x LOCATION
  // ============================================================

  console.log('Associando locais às pastas...');

  const folderLocationsData = [
    [0, 4],
    [0, 0],
    [1, 2],
    [1, 5],
    [2, 0],
    [2, 2],
    [3, 2],
    [3, 6],
    [4, 1],
    [4, 5],
    [5, 4],
    [6, 2],
  ];

  for (const [folderIndex, locationIndex] of folderLocationsData) {
    await prisma.folderLocation.create({
      data: {
        folderId: folders[folderIndex].id,
        locationId: locations[locationIndex].id,
      },
    });
  }

  // ============================================================
  // FINALIZAÇÃO
  // ============================================================

  console.log('');
  console.log('Seed concluída com sucesso!');
  console.log('');
  console.log(`Usuários: ${users.length}`);
  console.log(`Grupos: ${groups.length}`);
  console.log(`Relações UserGroup: ${groupMemberships.length}`);
  console.log(`Locations: ${locations.length}`);
  console.log(`Events: ${events.length}`);
  console.log(`Proposals: ${proposals.length}`);
  console.log(`Proposal responses: ${proposalResponses.length}`);
  console.log(`Moods: ${moodsData.length}`);
  console.log(`Availabilities: ${availabilitiesData.length}`);
  console.log(`Folders: ${folders.length}`);
  console.log(`Folder locations: ${folderLocationsData.length}`);
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
