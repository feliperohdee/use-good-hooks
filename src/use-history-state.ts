import { useCallback, useReducer, useRef } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import isNil from 'lodash/isNil';
import size from 'lodash/size';
import type { DebounceSettings } from 'lodash';

import useDebounceFn from './use-debounce-fn';

type HistoryAction<T> =
	| { type: 'CLEAR'; initialState: T }
	| { type: 'PAUSE' }
	| { type: 'REDO' }
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

type UseHistoryOptionsState<T> = {
	debounceSettings?: DebounceSettings;
	debounceTime?: number;
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

const historyReducer = <T>({
	action,
	immutable,
	maxCapacity,
	onChange,
	state
}: {
	action: HistoryAction<T>;
	immutable?: boolean;
	maxCapacity?: number;
	onChange?: HistoryOnChange<T>;
	state: HistoryState<T>;
}): HistoryState<T> => {
	const { future, past, paused, present } = state;

	if (action.type === 'PAUSE') {
		return {
			...state,
			paused: true
		};
	} else if (action.type === 'RESUME') {
		return {
			...state,
			paused: false
		};
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

		onChange?.({
			action: action.type,
			state: newState.present
		});

		return newState;
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

		onChange?.({
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

			onChange?.({
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
		if (
			!isNil(maxCapacity) &&
			maxCapacity > 0 &&
			size(newPast) > maxCapacity
		) {
			newPast = newPast.slice(size(newPast) - maxCapacity);
		}

		const newState = {
			future: [],
			past: newPast,
			paused,
			present: cloneValue(newPresent, immutable)
		};

		onChange?.({
			action: action.type,
			state: newState.present
		});

		return newState;
	} else if (action.type === 'CLEAR') {
		const newState = {
			future: [],
			past: [],
			paused,
			present: cloneValue(action.initialState, immutable)
		};

		onChange?.({
			action: action.type,
			state: newState.present
		});

		return newState;
	} else {
		throw new Error('Unsupported action type');
	}
};

const useHistoryState = <T>(
	initialState: T,
	options?: UseHistoryOptionsState<T>
) => {
	const { maxCapacity, debounceTime, debounceSettings, onChange, immutable } =
		options || {};

	const initialStateRef = useRef(initialState);
	const [state, dispatch] = useReducer(
		(state: HistoryState<T>, action: HistoryAction<T>) => {
			return historyReducer({
				action,
				immutable,
				maxCapacity,
				onChange,
				state
			});
		},
		{
			...initialHistoryState,
			paused: options?.paused ?? false,
			present: cloneValue(initialStateRef.current, immutable)
		}
	);

	const canRedo = size(state.future) !== 0;
	const canUndo = size(state.past) !== 0;

	const clear = useCallback(() => {
		return dispatch({
			initialState: initialStateRef.current,
			type: 'CLEAR'
		});
	}, []);

	const pause = useCallback(() => {
		dispatch({ type: 'PAUSE' });
	}, []);

	const resume = useCallback(() => {
		dispatch({ type: 'RESUME' });
	}, []);

	const redo = useCallback(() => {
		if (canRedo) {
			dispatch({ type: 'REDO' });
		}
	}, [canRedo]);

	const setDebounced = useDebounceFn(
		(newPresent: T) => {
			return dispatch({ type: 'SET', newPresent });
		},
		debounceTime,
		debounceSettings
	);

	const setDirect = useCallback((newPresent: T) => {
		return dispatch({ type: 'SET', newPresent });
	}, []);

	const undo = useCallback(() => {
		if (canUndo) {
			dispatch({ type: 'UNDO' });
		}
	}, [canUndo]);

	const set = useCallback(
		(newPresent: T) => {
			if (debounceTime) {
				setDebounced(newPresent);
			} else {
				setDirect(newPresent);
			}
		},
		[debounceTime, setDebounced, setDirect]
	);

	return {
		canRedo,
		canUndo,
		clear,
		future: state.future,
		past: state.past,
		pause,
		paused: state.paused,
		redo,
		resume,
		set,
		setDirect,
		state: state.present as T,
		undo
	};
};

export type { DebounceSettings };
export default useHistoryState;
