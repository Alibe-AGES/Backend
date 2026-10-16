import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const proposalAnswerSchema = z
  .object({
    answer: z.enum(['yes', 'no']),
  })
  .strict();

export class ProposalAnswerDto extends createZodDto(proposalAnswerSchema) {}
