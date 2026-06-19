import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import type { SystemAdminAuthUser } from '../../../../common/types/auth.types';

export interface AdminLoginResult {
  accessToken: string;
}

@Injectable()
export class AdminLoginUseCase {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(email: string, password: string): Promise<AdminLoginResult> {
    const admin = await this.repo.findSystemAdminByEmail(email);
    if (!admin) throw new InvalidCredentialsError();

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new InvalidCredentialsError();

    const payload: SystemAdminAuthUser = {
      sub: admin.id,
      type: 'system_admin',
      email: admin.email,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('jwt.expiresIn') ?? '8h',
    });

    return { accessToken };
  }
}
