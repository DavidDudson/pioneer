import { HttpStatus, message, ProblemMessage, ProblemType } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { ApiError } from './api-error';

const invalid: Problem = {
  type: ProblemType.Validation,
  title: 'The request is invalid',
  status: HttpStatus.UnprocessableContent,
  message: message(ProblemMessage.Validation),
  issues: [{ path: ['name'], message: message('validation.tooSmall', { origin: 'string', minimum: 1 }) }],
};

describe(ApiError, () => {
  it('describes a failure with the server problem message and its field issues', () => {
    const error = new ApiError(HttpStatus.UnprocessableContent, invalid);
    expect(ApiError.describe(error)).toStrictEqual(message(ProblemMessage.Validation));
    expect(error.issues).toStrictEqual(invalid.issues);
  });

  it('describes an unanswered request as unreachable', () => {
    expect(ApiError.describe(new ApiError(0, undefined))).toStrictEqual(message(ProblemMessage.Unreachable));
  });

  it('describes anything else as internal', () => {
    expect(ApiError.describe(new ApiError(HttpStatus.InternalServerError, undefined))).toStrictEqual(
      message(ProblemMessage.Internal),
    );
    expect(ApiError.describe(new Error('boom'))).toStrictEqual(message(ProblemMessage.Internal));
  });
});
