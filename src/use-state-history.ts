import { useCallback, useReducer, useRef } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import isNil from 'lodash/isNil';
import size from 'lodash/size';
import type { DebounceSettings } from 'lodash';

import useDebounceFn from './use-debounce-fn';

type HistoryAction<T> =
	| { type: 'CLEAR'; initialPresent: T }
	| { type: 'REDO' }
	| { type: 'SET'; newPresent: T }
	| { type: 'UNDO' };

type HistoryState<T> = {
	future: T[];
	past: T[];
	present: T | null;
};

type UseStateHistoryOptions = {
	debounceOptions?: DebounceSettings;
	debounceTime?: number;
	maxCapacity?: number;
};

const initialHistoryState = {
	past: [],
	present: null,
	future: []
};

const historyReducer = <T>(
	state: HistoryState<T>,
	action: HistoryAction<T>,
	maxCapacity?: number
): HistoryState<T> => {
	const { past, present, future } = state;

	if (action.type === 'UNDO') {
		if (size(past) === 0) {
			return state;
		}

		const previous = past[size(past) - 1];
		const newPast = past.slice(0, size(past) - 1);

		return {
			past: newPast,
			present: cloneDeep(previous),
			future: [cloneDeep(present as T), ...future]
		};
	} else if (action.type === 'REDO') {
		if (size(future) === 0) {
			return state;
		}

		const next = future[0];
		const newFuture = future.slice(1);

		return {
			past: [...past, cloneDeep(present as T)],
			present: cloneDeep(next),
			future: newFuture
		};
	} else if (action.type === 'SET') {
		const { newPresent } = action;

		// Avoid unnecessary updates if values are equal
		if (JSON.stringify(newPresent) === JSON.stringify(present)) {
			return state;
		}

		// Create new past array with capacity limit
		let newPast = [...past];
		if (present !== null) {
			newPast = [...newPast, cloneDeep(present)];
		}

		// Remove oldest entries if max capacity is reached
		if (
			!isNil(maxCapacity) &&
			maxCapacity > 0 &&
			size(newPast) > maxCapacity
		) {
			newPast = newPast.slice(size(newPast) - maxCapacity);
		}

		return {
			past: newPast,
			present: cloneDeep(newPresent),
			future: []
		};
	} else if (action.type === 'CLEAR') {
		return {
			past: [],
			present: cloneDeep(action.initialPresent),
			future: []
		};
	} else {
		throw new Error('Unsupported action type');
	}
};

const useStateHistory = <T>(
	initialPresent: T,
	options?: UseStateHistoryOptions
) => {
	const { maxCapacity, debounceTime, debounceOptions } = options || {};

	const initialPresentRef = useRef(initialPresent);
	const [state, dispatch] = useReducer(
		(state: HistoryState<T>, action: HistoryAction<T>) =>
			historyReducer(state, action, maxCapacity),
		{
			...initialHistoryState,
			present: cloneDeep(initialPresentRef.current)
		}
	);

	const canRedo = size(state.future) !== 0;
	const canUndo = size(state.past) !== 0;

	const setDirect = useCallback((newPresent: T) => {
		return dispatch({ type: 'SET', newPresent });
	}, []);

	const setDebounced = useDebounceFn(
		(newPresent: T) => {
			return dispatch({ type: 'SET', newPresent });
		},
		debounceTime,
		debounceOptions
	);

	const redo = useCallback(() => {
		if (canRedo) {
			dispatch({ type: 'REDO' });
		}
	}, [canRedo]);

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

	const clear = useCallback(() => {
		return dispatch({
			initialPresent: initialPresentRef.current,
			type: 'CLEAR'
		});
	}, []);

	return {
		canRedo,
		canUndo,
		clear,
		history: {
			past: state.past,
			future: state.future
		},
		redo,
		set,
		setDirect,
		state: state.present as T,
		undo
	};
};

export default useStateHistory;
