import { faker } from '@faker-js/faker';
import * as z from 'zod';
import { custom, fake, seed, setFaker } from 'zod-schema-faker/v4';

/**
 * Fake data from Zod schemas, via zod-schema-faker.
 *
 * zod-schema-faker 2.1 only consults `custom()` fakers for `z.custom()`
 * schemas and cannot fake codecs (`pipe`). So before faking, `wireSchema`
 * rewrites the schema: codecs become their wire side (`codec.in`) and
 * schemas registered with `registerFake` become `z.custom()` stand-ins with
 * our generator. The fake wire JSON is then decoded with the *original*
 * schema, which yields domain objects and validates every fake.
 */
const overrides = new Map<z.core.$ZodType, z.core.$ZodType>();
let configured = false;

/** Use `generate` whenever `schema` (this exact instance, including brands of it) is faked. */
export function registerFake(schema: z.core.$ZodType, generate: () => unknown): void {
  if (overrides.has(schema)) {
    return;
  }

  const standIn = z.custom<unknown>();
  custom(standIn, generate);
  overrides.set(schema, standIn);
}

/** Rewrite a schema into something zod-schema-faker can fake (see module doc). */
function wireSchema(schema: z.core.$ZodType): z.core.$ZodType {
  return overrides.get(schema) ?? unwrapped(schema) ?? rebuiltContainer(schema) ?? schema;
}

/** Codecs fake their wire side; optional/default/readonly wrappers are transparent. */
function unwrapped(schema: z.core.$ZodType): z.core.$ZodType | undefined {
  if (schema instanceof z.ZodPipe) {
    return wireSchema(schema.in);
  }

  if (schema instanceof z.ZodOptional) {
    return z.optional(wireSchema(schema.unwrap()));
  }

  if (schema instanceof z.ZodDefault) {
    return wireSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodReadonly) {
    return wireSchema(schema.unwrap());
  }

  return undefined;
}

function rebuiltContainer(schema: z.core.$ZodType): z.core.$ZodType | undefined {
  if (schema instanceof z.ZodObject) {
    return z.object(
      Object.fromEntries(Object.entries<z.core.$ZodType>(schema.shape).map(([key, value]) => [key, wireSchema(value)])),
    );
  }

  // Rebuilt arrays drop their length checks, so faker keeps them to a few items (a `.max(500)` would fake up to 500).
  if (schema instanceof z.ZodArray) {
    return z.array(wireSchema(schema.element));
  }

  if (schema instanceof z.ZodRecord) {
    return z.record(schema.keyType, wireSchema(schema.valueType));
  }

  if (schema instanceof z.ZodUnion) {
    return z.union(schema.options.map((option) => wireSchema(option)));
  }

  return undefined;
}

/** A fake, decoded value for `schema`, reproducible from `seedValue`. Install the relevant fakes first. */
export function fakeSeeded<TSchema extends z.ZodType>(schema: TSchema, seedValue: number): z.output<TSchema> {
  if (!configured) {
    configured = true;
    setFaker(faker);
  }

  seed(seedValue);

  return schema.parse(fake(wireSchema(schema)));
}
