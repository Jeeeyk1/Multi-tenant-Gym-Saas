import { CacheService } from './cache.service';
import type { RedisService } from '../redis/redis.service';

function makeCache(client: { get: jest.Mock; set: jest.Mock; del: jest.Mock }) {
  const redis = { getClient: () => client } as unknown as RedisService;
  return new CacheService(redis);
}

describe('CacheService', () => {
  it('wrap returns the cached value without calling compute on a hit', async () => {
    const client = { get: jest.fn().mockResolvedValue(JSON.stringify([{ a: 1 }])), set: jest.fn(), del: jest.fn() };
    const cache = makeCache(client);
    const compute = jest.fn();

    const result = await cache.wrap('k', 60, compute);

    expect(result).toEqual([{ a: 1 }]);
    expect(compute).not.toHaveBeenCalled();
    expect(client.set).not.toHaveBeenCalled();
  });

  it('wrap computes, stores with TTL, and returns on a miss', async () => {
    const client = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue('OK'), del: jest.fn() };
    const cache = makeCache(client);
    const compute = jest.fn().mockResolvedValue([{ b: 2 }]);

    const result = await cache.wrap('k', 60, compute);

    expect(result).toEqual([{ b: 2 }]);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify([{ b: 2 }]), 'EX', 60);
  });

  it('fails open: a Redis get error degrades to a compute (no throw)', async () => {
    const client = { get: jest.fn().mockRejectedValue(new Error('redis down')), set: jest.fn(), del: jest.fn() };
    const cache = makeCache(client);
    const compute = jest.fn().mockResolvedValue([{ c: 3 }]);

    const result = await cache.wrap('k', 60, compute);

    expect(result).toEqual([{ c: 3 }]);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('del swallows Redis errors (never throws)', async () => {
    const client = { get: jest.fn(), set: jest.fn(), del: jest.fn().mockRejectedValue(new Error('redis down')) };
    const cache = makeCache(client);
    await expect(cache.del('k')).resolves.toBeUndefined();
  });
});
