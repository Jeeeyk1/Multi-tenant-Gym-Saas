import { Injectable } from '@nestjs/common';
import { LeadsRepository } from '../../infrastructure/persistence/leads.repository';

@Injectable()
export class ListSignupRequestsUseCase {
  constructor(private readonly repo: LeadsRepository) {}

  execute() {
    return this.repo.list();
  }
}
