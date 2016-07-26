/* @flow */

export type RecordLogOptions = {
  maxActions?: ?number;
};

export type Log = {
  initialState: any;
  skipped: number;
  actions: Array<any>;
};

export function createActionLog(options: RecordLogOptions) {
  let {maxActions} = options;

  let store;
  let reducer;
  let initialState;
  let skipped = 0;
  let actions = [];

  function cull() {
    if (maxActions != null && actions.length > maxActions) {
      const skipping = actions.length-maxActions;
      const culling = actions.splice(0, skipping);
      skipped += skipping;
      initialState = culling.reduce(
        (state, action) => reducer(state, action),
        initialState
      );
    }
  }

  const enhancer = function(createStore: Function) {
    return function(_reducer: Function, _initialState: any, enhancer: Function) {
      if (store) throw new Error('redux-action-log enhancer can not be re-used');
      store = createStore(_reducer, _initialState, enhancer);
      const {dispatch} = store;
      initialState = _initialState;
      reducer = _reducer;
      return {
        ...store,
        dispatch(action) {
          actions.push(action);
          cull();
          return dispatch(action);
        }
      };
    };
  };

  return {
    enhancer,
    setMaxActions(n: ?number) {
      maxActions = n;
      cull();
    },
    getLog(): Log {
      return {initialState, skipped, actions: actions.slice()};
    },
    clear() {
      initialState = store.getState();
      skipped += actions.length;
      actions.length = 0;
    }
  };
}
