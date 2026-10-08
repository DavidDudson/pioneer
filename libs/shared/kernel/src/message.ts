import { z } from 'zod';

/** Values substituted into an ICU message. */
const MessageParamsSchema = z.record(z.string(), z.union([z.string(), z.number()]));
export type MessageParams = z.infer<typeof MessageParamsSchema>;

/**
 * Text as data (ADR-0009): a message key and its ICU params, formatted in the viewer's locale by
 * the UI. Domain, application and API code return these, never English strings.
 */
export const MessageDescriptorSchema = z.object({
  key: z.string().min(1),
  params: MessageParamsSchema.optional(),
});
export type MessageDescriptor = z.infer<typeof MessageDescriptorSchema>;

export function message(key: string, params?: MessageParams): MessageDescriptor {
  return params === undefined ? { key } : { key, params };
}

/** Keys for API problems; their `en` text ships in this lib's `i18n/en.json`. */
export const ProblemMessage = {
  NotFound: 'problem.notFound',
  RouteNotFound: 'problem.routeNotFound',
  VersionConflict: 'problem.versionConflict',
  Validation: 'problem.validation',
  Internal: 'problem.internal',
  Unreachable: 'problem.unreachable',
} as const;

/** Keys for validation issues, one per Zod issue code we surface. */
export const ValidationMessage = {
  Invalid: 'validation.invalid',
  InvalidType: 'validation.invalidType',
  TooSmall: 'validation.tooSmall',
  TooBig: 'validation.tooBig',
  InvalidFormat: 'validation.invalidFormat',
  NotMultipleOf: 'validation.notMultipleOf',
  InvalidValue: 'validation.invalidValue',
  Decimal: 'validation.decimal',
} as const;

/**
 * Refine options that make a custom Zod issue carry its own descriptor:
 * `.refine(check, issueParams(message('character.validation.unknownAncestry')))`.
 */
interface CarriedMessage {
  readonly message: MessageDescriptor;
}

/** Zod refine options carrying a descriptor in `params`. */
export interface IssueParams {
  readonly params: CarriedMessage;
}

export function issueParams(descriptor: MessageDescriptor): IssueParams {
  return { params: { message: descriptor } };
}

function customMessage(issue: z.core.$ZodIssueCustom): MessageDescriptor {
  const carried = MessageDescriptorSchema.safeParse(issue.params?.['message']);
  return carried.success ? carried.data : message(ValidationMessage.Invalid);
}

/** The descriptor for one Zod issue. Zod's own English `message` is never shown. */
export function issueMessage(issue: z.core.$ZodIssue): MessageDescriptor {
  switch (issue.code) {
    case 'invalid_type': {
      return message(ValidationMessage.InvalidType, { expected: issue.expected });
    }
    case 'too_small': {
      return message(ValidationMessage.TooSmall, { origin: issue.origin, minimum: Number(issue.minimum) });
    }
    case 'too_big': {
      return message(ValidationMessage.TooBig, { origin: issue.origin, maximum: Number(issue.maximum) });
    }
    case 'invalid_format': {
      return message(ValidationMessage.InvalidFormat, { format: issue.format });
    }
    case 'not_multiple_of': {
      return message(ValidationMessage.NotMultipleOf, { divisor: issue.divisor });
    }
    case 'invalid_value': {
      return message(ValidationMessage.InvalidValue);
    }
    case 'custom': {
      return customMessage(issue);
    }
    case 'invalid_union':
    case 'invalid_key':
    case 'invalid_element':
    case 'unrecognized_keys': {
      break;
    }
  }
  return message(ValidationMessage.Invalid);
}

const PathSegmentSchema = z.union([z.string(), z.number()]);

/** One invalid field: where, and what is wrong with it. */
export const FieldIssueSchema = z.object({
  path: z.array(PathSegmentSchema),
  message: MessageDescriptorSchema,
});
export type FieldIssue = z.infer<typeof FieldIssueSchema>;

export function fieldIssues(issues: readonly z.core.$ZodIssue[]): FieldIssue[] {
  return issues.map((issue) => ({
    path: issue.path.filter((segment) => typeof segment !== 'symbol'),
    message: issueMessage(issue),
  }));
}
