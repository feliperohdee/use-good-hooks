import { useEffect, useMemo, useReducer, useRef } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import size from 'lodash/size';
import type { DebounceSettings } from 'lodash';

type HistoryAction<T> =
	| { type: 'CLEAR'; initialState: T }
	| { type: 'PAUSE' }
	| { type: 'REDO' }
	| { type: 'REPLACE'; newPresent: T }
	| { type: 'RESUME' }
	| { type: 'SET'; newPresent: T }
	| { type: 'UNDO' };

type HistoryOnChange<T> = ({
	action,
	state
}: {
	action: HistoryAction<T>['type'];
	state: HistoryState<T>['present'];
}) => void;

type HistoryState<T> = {
	future: T[];
	past: T[];
	paused: boolean;
	present: T | null;
};

type HistoryOptions<T> = {
	debounceMs?: number;
	debounceSettings?: DebounceSettings;
	immutable?: boolean;
	maxCapacity?: number;
	onChange?: HistoryOnChange<T>;
	paused?: boolean;
};

const initialHistoryState = {
	future: [],
	past: [],
	present: null
};

const cloneValue = <T>(value: T, immutable?: boolean): T => {
	return immutable ? value : cloneDeep(value);
};

const valuesEqual = <T>(a: T, b: T, immutable?: boolean): boolean => {
	return immutable ? a === b : JSON.stringify(a) === JSON.stringify(b);
};

const useHistoryState = <T>(initialState: T, options?: HistoryOptions<T>) => {
	const initialStateRef = useRef(initialState);
	const optionsRef = useRef(options ?? {});
	const [state, dispatch] = useReducer(
		(state: HistoryState<T>, action: HistoryAction<T>) => {
			const {
				immutable = true,
				maxCapacity = 10,
				onChange = () => null
			} = optionsRef.current;

			const { future, past, paused, present } = state;

			if (action.type === 'CLEAR') {
				const newState = {
					future: [],
					past: [],
					paused,
					present: cloneValue(action.initialState, immutable)
				};

				onChange({
					action: action.type,
					state: newState.present
				});

				return newState;
			} else if (action.type === 'PAUSE') {
				return {
					...state,
					paused: true
				};
			} else if (action.type === 'REDO') {
				if (size(future) === 0) {
					return state;
				}

				const next = future[0];
				const newFuture = future.slice(1);
				const newState = {
					future: newFuture,
					past: [...past, cloneValue(present as T, immutable)],
					paused,
					present: cloneValue(next, immutable)
				};

				onChange({
					action: action.type,
					state: newState.present
				});

				return newState;
			} else if (action.type === 'RESUME') {
				return {
					...state,
					paused: false
				};
			} else if (action.type === 'REPLACE') {
				const { newPresent } = action;
				const newState = {
					...state,
					future: [],
					past: [],
					present: newPresent
				};

				onChange({
					action: action.type,
					state: newState.present
				});

				return newState;
			} else if (action.type === 'SET') {
				const { newPresent } = action;

				// Avoid unnecessary updates if values are equal
				if (valuesEqual(newPresent, present, immutable)) {
					return state;
				}

				// Update present immediately but don't add to history if paused
				if (paused) {
					const newState = {
						...state,
						present: cloneValue(newPresent, immutable)
					};

					onChange({
						action: action.type,
						state: newState.present
					});

					return newState;
				}

				// Create new past array with capacity limit
				let newPast = [...past];

				if (present !== null) {
					newPast = [...newPast, cloneValue(present, immutable)];
				}

				// Remove oldest entries if max capacity is reached
				if (maxCapacity > 0 && size(newPast) > maxCapacity) {
					newPast = newPast.slice(size(newPast) - maxCapacity);
				}

				const newState = {
					future: [],
					past: newPast,
					paused,
					present: cloneValue(newPresent, immutable)
				};

				onChange({
					action: action.type,
					state: newState.present
				});

				return newState;
			} else if (action.type === 'UNDO') {
				if (size(past) === 0) {
					return state;
				}

				const previous = past[size(past) - 1];
				const newPast = past.slice(0, size(past) - 1);
				const newState = {
					future: [cloneValue(present as T, immutable), ...future],
					past: newPast,
					paused,
					present: cloneValue(previous, immutable)
				};

				onChange({
					action: action.type,
					state: newState.present
				});

				return newState;
			} else {
				throw new Error('Unsupported action type');
			}
		},
		{
			...initialHistoryState,
			paused: optionsRef.current.paused ?? false,
			present: cloneValue(
				initialStateRef.current,
				optionsRef.current.immutable
			)
		}
	);

	const historyState = useMemo(() => {
		return {
			canRedo: size(state.future) !== 0,
			canUndo: size(state.past) !== 0,
			future: state.future,
			past: state.past,
			paused: state.paused,
			present: state.present as T
		};
	}, [state]);

	const historyActions = useMemo(() => {
		const { debounceMs = 250, debounceSettings } = optionsRef.current;
		const setDebounced = debounce(
			(newPresent: T) => {
				return dispatch({ type: 'SET', newPresent });
			},
			debounceMs,
			debounceSettings
		);

		return {
			clear: () => {
				dispatch({
					type: 'CLEAR',
					initialState: initialStateRef.current
				});
			},
			pause: () => {
				dispatch({ type: 'PAUSE' });
			},
			redo: () => {
				dispatch({ type: 'REDO' });
			},
			replace: (newPresent: T) => {
				dispatch({ type: 'REPLACE', newPresent });
			},
			resume: () => {
				dispatch({ type: 'RESUME' });
			},
			set: (newPresent: T) => {
				if (debounceMs) {
					setDebounced(newPresent);
				} else {
					dispatch({ type: 'SET', newPresent });
				}
			},
			setDirect: (newPresent: T) => {
				dispatch({ type: 'SET', newPresent });
			},
			undo: () => {
				dispatch({ type: 'UNDO' });
			}
		};
	}, []);

	// Update the ref when options change
	useEffect(() => {
		if (!options) {
			return;
		}

		optionsRef.current = options;
	}, [options]);

	return [historyState, historyActions] as const;
};

export type { DebounceSettings, HistoryAction, HistoryOptions, HistoryState };
export default useHistoryState;
