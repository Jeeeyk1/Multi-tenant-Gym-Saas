import { Module } from '@nestjs/common';
import { OrganizationController } from './presentation/controllers/organization.controller';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetOrganizationUseCase } from './application/use-cases/get-organization.use-case';
import { OrganizationRepository } from './infrastructure/persistence/organization.repository';

@Module({
  controllers: [OrganizationController],
  providers: [
    OrganizationRepository,
    CreateOrganizationUseCase,
    GetOrganizationUseCase,
  ],
})
export class OrganizationModule {}
