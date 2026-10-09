/**
 * Cloudflare Worker in front of the API's Lambda Function URL (ADR-0015). Cloudflare's free plan cannot rewrite
 * `Host`, and the Function URL only accepts SigV4-signed requests, so this Worker re-addresses and signs each one.
 * It also keeps the web app's hashed assets in the edge cache. Deployed by `infra/cloudflare.tf`.
 */
import { AwsClient } from 'aws4fetch';

import { proxy } from './proxy';
import type { EdgeCache, EdgeContext, EdgeEnv } from './proxy';

/** The Workers runtime's default cache; not in Bun's types, which this project builds against. */
declare const caches: { readonly default: EdgeCache };

interface Worker {
  readonly fetch: (request: Request, env: EdgeEnv, context: EdgeContext) => Promise<Response>;
}

const worker: Worker = {
  async fetch(request: Request, env: EdgeEnv, context: EdgeContext): Promise<Response> {
    // Signing only: retries are the caller's business, and a POST must never be sent twice.
    const signer = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      service: 'lambda',
      retries: 0,
    });
    return proxy(request, {
      functionUrl: new URL(env.FUNCTION_URL),
      signer,
      cache: caches.default,
      context,
      upstream: async (upstreamRequest: Request): Promise<Response> => fetch(upstreamRequest),
    });
  },
};

// oxlint-disable-next-line import/no-default-export -- the Workers runtime calls the module's default export
export default worker;
