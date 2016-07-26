/* @flow */

import assert from 'assert';
import {compose, createStore, applyMiddleware} from 'redux';

import {createActionLog} from '../src';

function reducer(state={counter: 0}, action) {
  if (action.type === 'ADD') {
    return {counter: state.counter+action.payload};
  }
  return state;
}

describe('recordLog', function() {
  it('reusing enhancer fails', function() {
    const actionLog = createActionLog({});
    createStore(reducer, undefined, actionLog.enhancer);
    assert.throws(() => {
      createStore(reducer, undefined, actionLog.enhancer);
    });
  });

  it('is composable', function() {
    function middleware() {
      return function(next) {
        return function(action) {
          next(action);
          next({...action, payload: action.payload*10});
        };
      };
    }

    const actionLog = createActionLog({});
    let enhancer = applyMiddleware(middleware);
    enhancer = compose(enhancer, actionLog.enhancer);
    const store = createStore(reducer, undefined, enhancer);

    assert.deepStrictEqual(store.getState(), {counter: 0});
    store.dispatch({type: 'ADD', payload: 3});
    assert.deepStrictEqual(store.getState(), {counter: 33});
    store.dispatch({type: 'ADD', payload: 5});
    assert.deepStrictEqual(store.getState(), {counter: 88});

    assert.deepStrictEqual(
      actionLog.getLog(),
      {
        initialState: undefined,
        skipped: 0,
        actions: [
          {type: 'ADD', payload: 3},
          {type: 'ADD', payload: 30},
          {type: 'ADD', payload: 5},
          {type: 'ADD', payload: 50}
        ]
      }
    );
  });

  describe('getLog', function() {
    it('basic case works', function() {
      const actionLog = createActionLog({});
      const store = createStore(reducer, undefined, actionLog.enhancer);

      assert.deepStrictEqual(store.getState(), {counter: 0});
      store.dispatch({type: 'ADD', payload: 3});
      assert.deepStrictEqual(store.getState(), {counter: 3});
      store.dispatch({type: 'ADD', payload: 5});
      assert.deepStrictEqual(store.getState(), {counter: 8});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: undefined,
          skipped: 0,
          actions: [
            {type: 'ADD', payload: 3},
            {type: 'ADD', payload: 5}
          ]
        }
      );
    });

    it('initialState is correct', function() {
      const actionLog = createActionLog({});
      const store = createStore(reducer, {counter: 1}, actionLog.enhancer);

      assert.deepStrictEqual(store.getState(), {counter: 1});
      store.dispatch({type: 'ADD', payload: 3});
      assert.deepStrictEqual(store.getState(), {counter: 4});
      store.dispatch({type: 'ADD', payload: 5});
      assert.deepStrictEqual(store.getState(), {counter: 9});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 1},
          skipped: 0,
          actions: [
            {type: 'ADD', payload: 3},
            {type: 'ADD', payload: 5}
          ]
        }
      );
    });

    it('can cull history', function() {
      const actionLog = createActionLog({limit: 3, snapshotInterval: 1});
      const store = createStore(reducer, {counter: 1}, actionLog.enhancer);

      assert.deepStrictEqual(store.getState(), {counter: 1});
      store.dispatch({type: 'ADD', payload: 3});
      assert.deepStrictEqual(store.getState(), {counter: 4});
      store.dispatch({type: 'ADD', payload: 5});
      assert.deepStrictEqual(store.getState(), {counter: 9});
      store.dispatch({type: 'ADD', payload: 7});
      assert.deepStrictEqual(store.getState(), {counter: 16});
      store.dispatch({type: 'ADD', payload: 9});
      assert.deepStrictEqual(store.getState(), {counter: 25});
      store.dispatch({type: 'ADD', payload: 13});
      assert.deepStrictEqual(store.getState(), {counter: 38});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 9},
          skipped: 2,
          actions: [
            {type: 'ADD', payload: 7},
            {type: 'ADD', payload: 9},
            {type: 'ADD', payload: 13}
          ]
        }
      );
    });
  });

  describe('clear', function() {
    it('works', function() {
      const actionLog = createActionLog({});
      const store = createStore(reducer, undefined, actionLog.enhancer);

      assert.deepStrictEqual(store.getState(), {counter: 0});
      store.dispatch({type: 'ADD', payload: 3});
      assert.deepStrictEqual(store.getState(), {counter: 3});
      store.dispatch({type: 'ADD', payload: 5});
      assert.deepStrictEqual(store.getState(), {counter: 8});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: undefined,
          skipped: 0,
          actions: [
            {type: 'ADD', payload: 3},
            {type: 'ADD', payload: 5}
          ]
        }
      );

      actionLog.clear();

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 8},
          skipped: 2,
          actions: []
        }
      );

      store.dispatch({type: 'ADD', payload: 7});
      assert.deepStrictEqual(store.getState(), {counter: 15});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 8},
          skipped: 2,
          actions: [
            {type: 'ADD', payload: 7}
          ]
        }
      );

      actionLog.clear();

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 15},
          skipped: 3,
          actions: []
        }
      );
    });
  });

  describe('setLimit', function() {
    it('works', function() {
      const actionLog = createActionLog({snapshotInterval: 2});
      const store = createStore(reducer, undefined, actionLog.enhancer);

      assert.deepStrictEqual(store.getState(), {counter: 0});
      store.dispatch({type: 'ADD', payload: 3});
      assert.deepStrictEqual(store.getState(), {counter: 3});
      store.dispatch({type: 'ADD', payload: 5});
      assert.deepStrictEqual(store.getState(), {counter: 8});
      store.dispatch({type: 'ADD', payload: 6});
      assert.deepStrictEqual(store.getState(), {counter: 14});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: undefined,
          skipped: 0,
          actions: [
            {type: 'ADD', payload: 3},
            {type: 'ADD', payload: 5},
            {type: 'ADD', payload: 6}
          ]
        }
      );

      actionLog.setLimit(1);

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 8},
          skipped: 2,
          actions: [
            {type: 'ADD', payload: 6}
          ]
        }
      );

      store.dispatch({type: 'ADD', payload: 7});
      assert.deepStrictEqual(store.getState(), {counter: 21});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 8},
          skipped: 2,
          actions: [
            {type: 'ADD', payload: 6},
            {type: 'ADD', payload: 7}
          ]
        }
      );

      store.dispatch({type: 'ADD', payload: 8});
      assert.deepStrictEqual(store.getState(), {counter: 29});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 21},
          skipped: 4,
          actions: [
            {type: 'ADD', payload: 8}
          ]
        }
      );

      actionLog.setLimit(null);

      store.dispatch({type: 'ADD', payload: 9});
      assert.deepStrictEqual(store.getState(), {counter: 38});
      store.dispatch({type: 'ADD', payload: 10});
      assert.deepStrictEqual(store.getState(), {counter: 48});

      assert.deepStrictEqual(
        actionLog.getLog(),
        {
          initialState: {counter: 21},
          skipped: 4,
          actions: [
            {type: 'ADD', payload: 8},
            {type: 'ADD', payload: 9},
            {type: 'ADD', payload: 10}
          ]
        }
      );
    });
  });
});
