import { Injectable } from '@nestjs/common';
import { LeadsRepository } from '../../infrastructure/persistence/leads.repository';
import { NotFoundError } from '../../../../common/errors';

@Injectable()
export class GetSignupRequestUseCase {
  constructor(private readonly repo: LeadsRepository) {}

  async execute(id: string) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundError('Signup request not found', 'SIGNUP_REQUEST_NOT_FOUND');
    return request;
  }
}
