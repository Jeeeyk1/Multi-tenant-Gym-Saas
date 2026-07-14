import { Injectable } from '@nestjs/common';
import { LeadsRepository } from '../../infrastructure/persistence/leads.repository';
import { SignupRequestStatus } from '../../../../common/enums';
import { ConflictError, NotFoundError } from '../../../../common/errors';

/**
 * Marks a signup request CONVERTED and links the gym created for it. The admin app calls this
 * right after successfully provisioning the gym via the normal `POST /admin/gyms` flow (Flow A)
 * — this use case does not provision anything itself, it just closes the loop on the lead.
 */
@Injectable()
export class ConvertSignupRequestUseCase {
  constructor(private readonly repo: LeadsRepository) {}

  async execute(id: string, gymId: string) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundError('Signup request not found', 'SIGNUP_REQUEST_NOT_FOUND');
    if (request.status === SignupRequestStatus.CONVERTED) {
      throw new ConflictError('This signup request was already converted', 'SIGNUP_REQUEST_ALREADY_CONVERTED');
    }

    return this.repo.markConverted(id, gymId);
  }
}
