import type { ClassTrack, RunPayload } from '@ritmofit/shared';

export type ClassDetailState =
  | {
      classId: null;
      requestId: number;
      status: 'idle';
      tracks: [];
      payload: null;
      error: null;
    }
  | {
      classId: string;
      requestId: number;
      status: 'loading';
      tracks: [];
      payload: null;
      error: null;
    }
  | {
      classId: string;
      requestId: number;
      status: 'ready';
      tracks: ClassTrack[];
      payload: RunPayload | null;
      error: null;
    }
  | {
      classId: string;
      requestId: number;
      status: 'error';
      tracks: [];
      payload: null;
      error: string;
    };

export type ClassDetailAction =
  | { type: 'begin'; classId: string; requestId: number }
  | {
      type: 'success';
      classId: string;
      requestId: number;
      tracks: ClassTrack[];
      payload: RunPayload | null;
    }
  | { type: 'failure'; classId: string; requestId: number; error: string }
  | { type: 'reset'; requestId: number };

export const initialClassDetailState: ClassDetailState = {
  classId: null,
  requestId: 0,
  status: 'idle',
  tracks: [],
  payload: null,
  error: null,
};

/**
 * Only the newest request generation may change detail state. Starting a request
 * clears the prior class immediately, so a new header can never render old tracks.
 */
export function classDetailReducer(
  state: ClassDetailState,
  action: ClassDetailAction,
): ClassDetailState {
  if (action.requestId < state.requestId) return state;

  switch (action.type) {
    case 'begin':
      return {
        classId: action.classId,
        requestId: action.requestId,
        status: 'loading',
        tracks: [],
        payload: null,
        error: null,
      };
    case 'success':
      return {
        classId: action.classId,
        requestId: action.requestId,
        status: 'ready',
        tracks: action.tracks,
        payload: action.payload,
        error: null,
      };
    case 'failure':
      return {
        classId: action.classId,
        requestId: action.requestId,
        status: 'error',
        tracks: [],
        payload: null,
        error: action.error,
      };
    case 'reset':
      return {
        ...initialClassDetailState,
        requestId: action.requestId,
      };
  }
}
