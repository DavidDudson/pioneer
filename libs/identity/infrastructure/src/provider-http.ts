import type { z } from 'zod';

/** One authenticated provider REST call (bearer token), validated with `schema`. */
export async function getJson<TSchema extends z.ZodType>(
  url: string,
  accessToken: string,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const response = await fetch(url, {
    headers: { accept: 'application/json', authorization: `Bearer ${accessToken}`, 'user-agent': 'pioneer' },
  });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  const body: unknown = await response.json();
  return schema.parse(body);
}

/** An OAuth app registered with a provider. */
export interface OAuthCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
  /** `<PUBLIC_ORIGIN>/api/auth/<provider>/callback`, registered with the provider. */
  readonly redirectUri: URL;
}
