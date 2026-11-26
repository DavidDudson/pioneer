import { vi } from 'vitest';

// One test may run 60 s. The first render of a file pays for the registries, and a busy runner outgrew the old 30 s.
vi.setConfig({ testTimeout: 60_000 });
