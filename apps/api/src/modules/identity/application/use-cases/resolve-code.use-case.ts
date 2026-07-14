import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';
import { CacheService } from '../../../../common/cache/cache.service';

// Hit on every login screen. Theme/branding changes are rare, so a short TTL with no
// explicit invalidation is the right trade — new branding shows within the window.
// NotFound throws, so unknown codes are never cached (no negative caching).
const RESOLVE_CODE_TTL_SECONDS = 60;

export interface ResolveCodeResult {
  type: 'ORGANIZATION' | 'GYM';
  name: string;
  slug?: string;
  code?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string | null;
}

@Injectable()
export class ResolveCodeUseCase {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly cache: CacheService,
  ) {}

  execute(code: string): Promise<ResolveCodeResult> {
    return this.cache.wrap(`resolve-code:${code}`, RESOLVE_CODE_TTL_SECONDS, () => this.resolve(code));
  }

  private async resolve(code: string): Promise<ResolveCodeResult> {
    // Check organizations first (slug match)
    const org = await this.repo.findOrgBySlug(code);
    if (org) {
      return { type: 'ORGANIZATION', name: org.name, slug: org.slug };
    }

    // Check gyms (code match — always uppercase)
    const gym = await this.repo.findGymByCode(code);
    if (gym) {
      return {
        type: 'GYM',
        name: gym.name,
        code: gym.code,
        primaryColor: gym.profile?.primaryColor ?? undefined,
        secondaryColor: gym.profile?.secondaryColor ?? undefined,
        logoUrl: gym.profile?.logoUrl ?? null,
      };
    }

    throw new NotFoundError('Code not found');
  }
}
