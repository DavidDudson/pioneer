import {
  DomainError,
  fieldIssues,
  HttpStatus,
  message,
  ProblemMessage,
  ProblemType,
  ValidationError,
} from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';
import * as z from 'zod';

/** RFC 9457 titles: fixed developer summaries per type. Users see `message`, formatted in their locale. */
const TITLE: Readonly<Record<ProblemType, string>> = {
  [ProblemType.Unauthorized]: 'Unauthorized',
  [ProblemType.Forbidden]: 'Forbidden',
  [ProblemType.NotFound]: 'Not found',
  [ProblemType.Gone]: 'Gone',
  [ProblemType.VersionConflict]: 'Version conflict',
  [ProblemType.Validation]: 'The request is invalid',
  [ProblemType.Internal]: 'Internal error',
};

function toProblem(error: unknown): Problem {
  if (error instanceof ValidationError) {
    return {
      type: error.type,
      title: TITLE[error.type],
      status: error.status,
      message: error.descriptor,
      issues: [...error.issues],
    };
  }
  if (error instanceof DomainError) {
    return { type: error.type, title: TITLE[error.type], status: error.status, message: error.descriptor };
  }
  if (error instanceof z.ZodError) {
    return {
      type: ProblemType.Validation,
      title: TITLE[ProblemType.Validation],
      status: HttpStatus.UnprocessableContent,
      detail: z.prettifyError(error),
      message: message(ProblemMessage.Validation),
      issues: fieldIssues(error.issues),
    };
  }
  return {
    type: ProblemType.Internal,
    title: TITLE[ProblemType.Internal],
    status: HttpStatus.InternalServerError,
    message: message(ProblemMessage.Internal),
  };
}

/** Maps every thrown error to an RFC 9457 problem response. */
export const problemHandler = new Elysia({ name: 'problem-handler' }).onError(
  { as: 'global' },
  ({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = HttpStatus.NotFound;
      return {
        type: ProblemType.NotFound,
        title: 'Route not found',
        status: HttpStatus.NotFound,
        message: message(ProblemMessage.RouteNotFound),
      } satisfies Problem;
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
