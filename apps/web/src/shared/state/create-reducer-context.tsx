import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, PropsWithChildren, Reducer } from 'react';

export function createReducerContext<State, Action>(
  name: string,
  reducer: Reducer<State, Action>,
  initialState: State,
) {
  // Centinela propio: el estado puede ser legítimamente `null`.
  const MISSING = Symbol(`${name}Provider missing`);
  const StateContext = createContext<State | typeof MISSING>(MISSING);
  const DispatchContext = createContext<Dispatch<Action> | typeof MISSING>(
    MISSING,
  );

  function Provider({ children }: PropsWithChildren) {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
      <StateContext value={state}>
        <DispatchContext value={dispatch}>{children}</DispatchContext>
      </StateContext>
    );
  }

  function useState(): State {
    const state = useContext(StateContext);
    if (state === MISSING) {
      throw new Error(`use${name}State must be used within ${name}Provider`);
    }
    return state;
  }

  function useDispatch(): Dispatch<Action> {
    const dispatch = useContext(DispatchContext);
    if (dispatch === MISSING) {
      throw new Error(`use${name}Dispatch must be used within ${name}Provider`);
    }
    return dispatch;
  }

  return { Provider, useState, useDispatch };
}
