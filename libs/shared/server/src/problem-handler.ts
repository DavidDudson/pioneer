import { DomainError } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';
import { z } from 'zod';

const HTTP_UNPROCESSABLE = 422;
const HTTP_INTERNAL = 500;

function toProblem(error: unknown): Problem {
  if (error instanceof DomainError) {
    return { type: error.type, title: error.message, status: error.status };
  }
  if (error instanceof z.ZodError) {
    return {
      type: 'validation',
      title: 'The request is invalid',
      status: HTTP_UNPROCESSABLE,
      detail: z.prettifyError(error),
    };
  }
  return { type: 'internal', title: 'Something went wrong', status: HTTP_INTERNAL };
}

/** Maps every thrown error to an RFC 9457 problem response. */
export const problemHandler = new Elysia({ name: 'problem-handler' }).onError(
  { as: 'global' },
  ({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { type: 'not-found', title: 'Route not found', status: 404 } satisfies Problem;
    }
    const problem = toProblem(error);
    if (problem.status === HTTP_INTERNAL) {
      console.error(error);
    }
    set.status = problem.status;
    set.headers['content-type'] = 'application/problem+json';
    return problem;
  },
);
