import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { SignupRequestStatus } from '../../../../common/enums';

export interface CreateSignupRequestInput {
  gymName: string;
  ownerName: string;
  email: string;
  phone?: string;
  planInterest?: string;
}

@Injectable()
export class LeadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateSignupRequestInput) {
    return this.prisma.signupRequest.create({ data: input });
  }

  list() {
    return this.prisma.signupRequest.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.signupRequest.findUnique({ where: { id } });
  }

  updateStatus(id: string, status: SignupRequestStatus, notes?: string) {
    return this.prisma.signupRequest.update({
      where: { id },
      data: { status, ...(notes !== undefined ? { notes } : {}) },
    });
  }

  markConverted(id: string, gymId: string) {
    return this.prisma.signupRequest.update({
      where: { id },
      data: { status: SignupRequestStatus.CONVERTED, convertedGymId: gymId },
    });
  }
}
