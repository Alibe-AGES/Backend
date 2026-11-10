import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { PrismaService } from '../prisma/prisma.service';

type HealthStatus = { status: 'ok' };

@ApiTags('Health')
@AllowAnonymous()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness: confirma que o processo responde' })
  @ApiResponse({ status: 200, description: 'Processo ativo' })
  live(): HealthStatus {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness: confirma que a API consegue acessar o banco' })
  @ApiResponse({ status: 200, description: 'Pronta para receber tráfego' })
  @ApiResponse({ status: 503, description: 'Banco indisponível' })
  async ready(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }

    return { status: 'ok' };
  }
}
