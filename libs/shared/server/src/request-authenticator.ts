import type { UserId } from '@pioneer/shared/kernel';
import type { HTTPHeaders } from 'elysia';

/** What a handler exchanges with the transport: the raw request in, extra headers out. */
export interface RequestExchange {
  /** The raw request, for transport concerns such as the session cookie. */
  readonly request: Request;
  /** Headers to add to the response, for transport concerns such as a renewed session cookie. */
  readonly responseHeaders: HTTPHeaders;
}

/**
 * Port: who sent a request. Identity implements it with sessions; other contexts' routes take it
 * so they can pass the acting user to their services without depending on identity.
 */
export abstract class RequestAuthenticator {
  /** The signed-in user behind `exchange`; throws `UnauthorizedError` when there is none. */
  public abstract actingUser(exchange: RequestExchange): Promise<UserId>;
}
