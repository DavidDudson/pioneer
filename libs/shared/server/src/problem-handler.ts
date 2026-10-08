import { DomainError, HttpStatus, ProblemType } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';
import { z } from 'zod';

function toProblem(error: unknown): Problem {
  if (error instanceof DomainError) {
    return { type: error.type, title: error.message, status: error.status };
  }
  if (error instanceof z.ZodError) {
    return {
      type: ProblemType.Validation,
      title: 'The request is invalid',
      status: HttpStatus.UnprocessableContent,
      detail: z.prettifyError(error),
    };
  }
  return { type: ProblemType.Internal, title: 'Something went wrong', status: HttpStatus.InternalServerError };
}

/** Maps every thrown error to an RFC 9457 problem response. */
export const problemHandler = new Elysia({ name: 'problem-handler' }).onError(
  { as: 'global' },
  ({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = HttpStatus.NotFound;
      return { type: ProblemType.NotFound, title: 'Route not found', status: HttpStatus.NotFound } satisfies Problem;
    }
    const problem = toProblem(error);
    if (problem.status === HttpStatus.InternalServerError) {
      console.error(error);
    }
    set.status = problem.status;
    set.headers['content-type'] = 'application/problem+json';
    return problem;
  },
);
