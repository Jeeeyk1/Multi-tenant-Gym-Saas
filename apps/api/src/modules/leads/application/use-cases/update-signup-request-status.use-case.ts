import { Injectable } from '@nestjs/common';
import { LeadsRepository } from '../../infrastructure/persistence/leads.repository';
import { SignupRequestStatus } from '../../../../common/enums';
import { ConflictError, NotFoundError } from '../../../../common/errors';

@Injectable()
export class UpdateSignupRequestStatusUseCase {
  constructor(private readonly repo: LeadsRepository) {}

  async execute(
    id: string,
    status: SignupRequestStatus.CONTACTED | SignupRequestStatus.REJECTED,
    notes?: string,
  ) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundError('Signup request not found', 'SIGNUP_REQUEST_NOT_FOUND');
    if (request.status === SignupRequestStatus.CONVERTED) {
      throw new ConflictError('This signup request was already converted', 'SIGNUP_REQUEST_ALREADY_CONVERTED');
    }

    return this.repo.updateStatus(id, status, notes);
  }
}
