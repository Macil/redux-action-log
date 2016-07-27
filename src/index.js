/* @flow */

export type RecordLogOptions = {
  limit?: ?number;
  snapshotInterval?: ?number;
};

export type Log = {
  initialState: any;
  skipped: number;
  actions: Array<ActionEntry>;
};

export type ActionEntry = {
  action: any;
  timestamp: number;
};

type Chunk = {
  state: any;
  actions: Array<ActionEntry>;
};

export function createActionLog(options: RecordLogOptions) {
  const {snapshotInterval=20} = options;
  let {limit=200} = options;

  let store;
  let chunks: Chunk[] = [];
  let skipped = 0;

  function countActionsInChunks() {
    return (chunks.length-1)*(snapshotInterval||0) +
      chunks[chunks.length-1].actions.length;
  }

  function cull() {
    if (limit == null || snapshotInterval == null) return;
    const extraActionsCount = countActionsInChunks() - limit;
    const firstNecessaryChunk = Math.floor(extraActionsCount/snapshotInterval);
    if (firstNecessaryChunk > 0) {
      chunks.splice(0, firstNecessaryChunk);
      skipped += firstNecessaryChunk*snapshotInterval;
    }
  }

  const enhancer = function(createStore: Function) {
    return function(reducer: Function, initialState: any, enhancer: Function) {
      if (store) throw new Error('redux-action-log enhancer can not be re-used');
      store = createStore(reducer, initialState, enhancer);
      const {dispatch} = store;
      chunks.push({
        state: initialState,
        actions: []
      });
      return {
        ...store,
        dispatch(action) {
          const lastChunk = chunks[chunks.length-1];
          const actionEntry = {action, timestamp: Date.now()};
          if (lastChunk.actions.length === snapshotInterval) {
            chunks.push({
              state: store.getState(),
              actions: [actionEntry]
            });
          } else {
            lastChunk.actions.push(actionEntry);
          }
          cull();
          return dispatch(action);
        }
      };
    };
  };

  return {
    enhancer,
    setLimit(n: ?number) {
      limit = n;
      cull();
    },
    getLog(): Log {
      return {
        initialState: chunks[0].state,
        skipped,
        actions: [].concat(...chunks.map(c => c.actions))
      };
    },
    clear() {
      skipped += countActionsInChunks();
      chunks = [{
        state: store.getState(),
        actions: []
      }];
    }
  };
}
