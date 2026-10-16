import { Controller } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { PrometheusController } from '@willsoto/nestjs-prometheus';

@AllowAnonymous()
@Controller()
export class PublicMetricsController extends PrometheusController {}
