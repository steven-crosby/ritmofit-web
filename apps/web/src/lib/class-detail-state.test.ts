import { describe, expect, it } from 'vitest';
import type { ClassTrack } from '@ritmofit/shared';
import {
  classDetailReducer,
  initialClassDetailState,
  type ClassDetailState,
} from './class-detail-state.js';

describe('classDetailReducer', () => {
  it('clears the previous class as soon as a new request begins', () => {
    const oldTrack: ClassTrack = {
      id: '00000000-0000-4000-8000-000000000001',
      classId: '00000000-0000-4000-8000-000000000002',
      trackId: '00000000-0000-4000-8000-000000000003',
      position: 0,
      intensity: 'mod',
      displayBpmOverride: null,
      durationMsOverride: null,
      clipStartMs: 0,
      clipEndMs: null,
      startOffsetMs: 0,
      notes: null,
      createdAt: 1,
      updatedAt: 1,
    };
    const ready: ClassDetailState = {
      classId: 'class-a',
      requestId: 1,
      status: 'ready',
      tracks: [oldTrack],
      payload: null,
      error: null,
    };

    expect(
      classDetailReducer(ready, {
        type: 'begin',
        classId: 'class-b',
        requestId: 2,
      }),
    ).toEqual({
      classId: 'class-b',
      requestId: 2,
      status: 'loading',
      tracks: [],
      payload: null,
      error: null,
    });
  });

  it('ignores an older response that arrives after a newer class request', () => {
    const loadingB = classDetailReducer(initialClassDetailState, {
      type: 'begin',
      classId: 'class-b',
      requestId: 2,
    });

    expect(
      classDetailReducer(loadingB, {
        type: 'success',
        classId: 'class-a',
        requestId: 1,
        tracks: [],
        payload: null,
      }),
    ).toBe(loadingB);
  });

  it('ignores an older failure after the newest class has loaded', () => {
    const readyB = classDetailReducer(
      classDetailReducer(initialClassDetailState, {
        type: 'begin',
        classId: 'class-b',
        requestId: 2,
      }),
      {
        type: 'success',
        classId: 'class-b',
        requestId: 2,
        tracks: [],
        payload: null,
      },
    );

    expect(
      classDetailReducer(readyB, {
        type: 'failure',
        classId: 'class-a',
        requestId: 1,
        error: 'late failure',
      }),
    ).toBe(readyB);
  });
});
