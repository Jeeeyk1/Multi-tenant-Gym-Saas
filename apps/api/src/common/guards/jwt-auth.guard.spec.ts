import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { ExecutionContext } from '@nestjs/common';

const mockJwt = { verify: jest.fn() } as unknown as JwtService;
const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
} as unknown as ConfigService;

function buildContext(authHeader?: string): ExecutionContext {
  const request = { headers: { authorization: authHeader }, user: undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(mockJwt, mockConfig);
  });

  it('returns true and sets request.user for a valid token', () => {
    const payload = { sub: 'user-1', type: 'gym' };
    (mockJwt.verify as jest.Mock).mockReturnValue(payload);
    const ctx = buildContext('Bearer valid-token');
    const request = ctx.switchToHttp().getRequest<Record<string, unknown>>();

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('throws UnauthorizedException when no Authorization header', () => {
    expect(() => guard.canActivate(buildContext())).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when scheme is not Bearer', () => {
    expect(() => guard.canActivate(buildContext('Basic token'))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when jwt.verify throws', () => {
    (mockJwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid signature');
    });
    expect(() => guard.canActivate(buildContext('Bearer bad-token'))).toThrow(
      UnauthorizedException,
    );
  });
});
