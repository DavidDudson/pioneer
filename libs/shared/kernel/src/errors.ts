import * as z from 'zod';

import { FieldIssueSchema, message, MessageDescriptorSchema, ProblemMessage } from './message';
import type { FieldIssue, MessageDescriptor } from './message';
import type { ValueOf } from './value-of';

/** HTTP statuses the API answers errors with. */
export const HttpStatus = {
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  Gone: 410,
  UnprocessableContent: 422,
  InternalServerError: 500,
} as const;
export type HttpStatus = ValueOf<typeof HttpStatus>;

/** RFC 9457 `type` of every problem the API returns. */
export const ProblemType = {
  Unauthorized: 'unauthorized',
  Forbidden: 'forbidden',
  NotFound: 'not-found',
  Gone: 'gone',
  VersionConflict: 'version-conflict',
  Validation: 'validation',
  Internal: 'internal',
} as const;
export type ProblemType = ValueOf<typeof ProblemType>;

/**
 * Base for errors that carry domain meaning across the API boundary. `message` is for logs;
 * `descriptor` is what the viewer reads, formatted in their locale (ADR-0009).
 */
export abstract class DomainError extends Error {
  public override readonly name: string = 'DomainError';
  public abstract readonly status: HttpStatus;
  public abstract readonly type: ProblemType;
  public abstract readonly descriptor: MessageDescriptor;
}

/** The request needs a signed-in user and carries no valid session. */
export class UnauthorizedError extends DomainError {
  public override readonly name = 'UnauthorizedError';
  public readonly status = HttpStatus.Unauthorized;
  public readonly type = ProblemType.Unauthorized;
  public readonly descriptor = message(ProblemMessage.Unauthorized);

  public constructor() {
    super('No signed-in user');
  }
}

/**
 * Refused whoever is signed in, such as a cookie-authenticated write sent from another site, or
 * refused by a policy whose reason the viewer can act on (`descriptor`).
 */
export class ForbiddenError extends DomainError {
  public override readonly name = 'ForbiddenError';
  public readonly status = HttpStatus.Forbidden;
  public readonly type = ProblemType.Forbidden;
  public readonly descriptor: MessageDescriptor;

  public constructor(reason: string, descriptor: MessageDescriptor = message(ProblemMessage.Forbidden)) {
    super(reason);
    this.descriptor = descriptor;
  }
}

export class NotFoundError extends DomainError {
  public override readonly name = 'NotFoundError';
  public readonly status = HttpStatus.NotFound;
  public readonly type = ProblemType.NotFound;
  public readonly descriptor: MessageDescriptor;

  public constructor(resource: string, id: string, descriptor: MessageDescriptor = message(ProblemMessage.NotFound)) {
    super(`${resource} ${id} was not found`);
    this.descriptor = descriptor;
  }
}

/** The resource existed but can no longer be used, such as an expired or revoked invite. */
export class GoneError extends DomainError {
  public override readonly name = 'GoneError';
  public readonly status = HttpStatus.Gone;
  public readonly type = ProblemType.Gone;
  public readonly descriptor: MessageDescriptor;

  public constructor(resource: string, id: string, descriptor: MessageDescriptor = message(ProblemMessage.Gone)) {
    super(`${resource} ${id} is no longer available`);
    this.descriptor = descriptor;
  }
}

/** Optimistic concurrency failure: the aggregate changed since the client read it. */
export class VersionConflictError extends DomainError {
  public override readonly name = 'VersionConflictError';
  public readonly status = HttpStatus.Conflict;
  public readonly type = ProblemType.VersionConflict;
  public readonly descriptor: MessageDescriptor;

  public constructor(
    resource: string,
    id: string,
    descriptor: MessageDescriptor = message(ProblemMessage.VersionConflict),
  ) {
    super(`${resource} ${id} was changed by someone else`);
    this.descriptor = descriptor;
  }
}

export class ValidationError extends DomainError {
  public override readonly name = 'ValidationError';
  public readonly status = HttpStatus.UnprocessableContent;
  public readonly type = ProblemType.Validation;
  public readonly descriptor = message(ProblemMessage.Validation);
  public readonly issues: readonly FieldIssue[];

  public constructor(issues: readonly FieldIssue[]) {
    super(
      `The request is invalid: ${issues.map((issue) => `${issue.path.join('.')} ${issue.message.key}`).join(', ')}`,
    );
    this.issues = issues;
  }
}

/**
 * RFC 9457 problem details, the wire shape of every API error. `title` and `detail` are fixed
 * developer text; the UI shows `message` and per-field `issues`, formatted in the viewer's locale.
 */
export const ProblemSchema = z.object({
  type: z.enum(ProblemType),
  title: z.string(),
  status: z.enum(HttpStatus),
  detail: z.string().optional(),
  message: MessageDescriptorSchema,
  issues: z.array(FieldIssueSchema).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
