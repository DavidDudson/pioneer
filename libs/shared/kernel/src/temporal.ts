/**
 * The only module allowed to import the Temporal polyfill. Bun (JSC) and
 * Safari do not ship Temporal yet; everything else imports `Temporal` from
 * `@pioneer/shared/kernel`. `Date` is banned by lint.
 */
export { Temporal } from 'temporal-polyfill';
