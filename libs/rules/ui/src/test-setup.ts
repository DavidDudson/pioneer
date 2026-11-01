import { vi } from 'vitest';

// One test may run 30 s: the first render of a file pays for the registries, seconds on a busy runner.
vi.setConfig({ testTimeout: 30_000 });
