import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { IdlePreloading, PREFETCH_WHEN_IDLE } from './idle-preloading';
import { IDLE_SCHEDULER } from './idle-scheduler';

interface Setup {
  readonly strategy: IdlePreloading;
  readonly runIdle: () => void;
}

function setup(): Setup {
  const tasks: (() => void)[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: IDLE_SCHEDULER,
        useValue: (task: () => void): void => {
          tasks.push(task);
        },
      },
    ],
  });
  return {
    strategy: TestBed.inject(IdlePreloading),
    runIdle: () => {
      for (const task of tasks.splice(0)) {
        task();
      }
    },
  };
}

describe(IdlePreloading, () => {
  it('loads a marked route only once the browser is idle', () => {
    const { strategy, runIdle } = setup();
    const load = vi.fn<() => Observable<string>>(() => of('loaded'));
    const emitted: unknown[] = [];

    strategy.preload({ path: 'next', data: PREFETCH_WHEN_IDLE }, load).subscribe((value) => {
      emitted.push(value);
    });
    expect(load).not.toHaveBeenCalled();

    runIdle();
    expect(emitted).toStrictEqual(['loaded']);
  });

  it('never preloads an unmarked route', () => {
    const { strategy, runIdle } = setup();
    const load = vi.fn<() => Observable<string>>(() => of('loaded'));

    strategy.preload({ path: 'rare' }, load).subscribe();
    runIdle();
    expect(load).not.toHaveBeenCalled();
  });
});
