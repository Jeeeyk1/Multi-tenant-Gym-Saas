import { HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { NotFoundError } from '../errors/not-found.error';
import { ForbiddenError } from '../errors/forbidden.error';
import type { ArgumentsHost } from '@nestjs/common';

function buildHost(url = '/test', method = 'GET') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url, method };
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost,
    json,
    status,
  };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('maps a DomainError (NotFoundError) to its status code and code field', () => {
    const { host, status, json } = buildHost();
    filter.catch(new NotFoundError('Item not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Item not found',
      }),
    );
  });

  it('maps a DomainError (ForbiddenError) correctly', () => {
    const { host, status } = buildHost();
    filter.catch(new ForbiddenError('Access denied'), host);
    expect(status).toHaveBeenCalledWith(403);
  });

  it('maps an HttpException to its status with null code', () => {
    const { host, status, json } = buildHost();
    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: null, statusCode: 404 }),
    );
  });

  it('maps unknown errors to 500 with null code', () => {
    const { host, status, json } = buildHost();
    filter.catch(new Error('Something unexpected'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, code: null }),
    );
  });

  it('includes path and timestamp in the response', () => {
    const { host, json } = buildHost('/api/test');
    filter.catch(new NotFoundError('x'), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/test', timestamp: expect.any(String) }),
    );
  });
});
