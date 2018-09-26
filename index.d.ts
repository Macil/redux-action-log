import {Action, AnyAction, StoreEnhancer} from 'redux';

export interface RecordLogOptions {
  limit?: number | null;
  snapshotInterval?: number | null;
}

export interface Log<S = any, A extends Action = AnyAction> {
  initialState: S;
  skipped: number;
  actions: Array<ActionEntry<A>>;
}

export interface ActionEntry<A extends Action = AnyAction> {
  action: A;
  timestamp: number;
}

export interface ActionLog<S = any, A extends Action = AnyAction> {
  enhancer: StoreEnhancer;
  setLimit(n: number | null): void;
  getLog(): Log<S, A>;
  clear(): void;
}

export function createActionLog<S = any, A extends Action = AnyAction>(options: RecordLogOptions): ActionLog<S, A>;
