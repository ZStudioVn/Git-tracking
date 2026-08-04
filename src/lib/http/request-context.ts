import { randomUUID } from 'crypto';

export function getRequestId(request: Request): string {
  const supplied = request.headers.get('x-request-id');
  return supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : randomUUID();
}

export function withRequestId(response: Response, requestId: string): Response {
  response.headers.set('x-request-id', requestId);
  return response;
}
