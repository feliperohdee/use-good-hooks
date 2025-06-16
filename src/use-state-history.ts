import { useCallback, useReducer, useRef, useEffect } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import size from 'lodash/size';
import throttle from 'lodash/throttle';
import type { DebounceSettings, ThrottleSettings } from 'lodash';

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
	throttleOptions?: ThrottleSettings;
	throttleTime?: number;
};

const initialHistoryState = {
	past: [],
	present: null,
	future: []
};

/**
 * Reducer for managing state history
 */
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
			maxCapacity !== undefined &&
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
	options?: UseStateHistoryOptions | number
) => {
	// Handle backward compatibility (old API accepted maxCapacity as second parameter)
	const resolvedOptions: UseStateHistoryOptions =
		typeof options === 'number' ? { maxCapacity: options } : options || {};

	const {
		maxCapacity,
		debounceTime,
		debounceOptions,
		throttleTime,
		throttleOptions
	} = resolvedOptions;

	const initialPresentRef = useRef(initialPresent);

	const [state, dispatch] = useReducer(
		(state: HistoryState<T>, action: HistoryAction<T>) =>
			historyReducer(state, action, maxCapacity),
		{
			...initialHistoryState,
			present: cloneDeep(initialPresentRef.current)
		}
	);

	const canUndo = size(state.past) !== 0;
	const canRedo = size(state.future) !== 0;

	const undo = useCallback(() => {
		if (canUndo) {
			dispatch({ type: 'UNDO' });
		}
	}, [canUndo]);

	const redo = useCallback(() => {
		if (canRedo) {
			dispatch({ type: 'REDO' });
		}
	}, [canRedo]);

	// Create direct set function (no timing modifiers)
	const setDirect = useCallback(
		(newPresent: T) => dispatch({ type: 'SET', newPresent }),
		[]
	);

	// Set up debounced version of set if needed
	const debouncedSetRef = useRef<((newPresent: T) => void) | null>(null);

	// Set up throttled version of set if needed
	const throttledSetRef = useRef<((newPresent: T) => void) | null>(null);

	// Configure debounced/throttled functions based on options
	useEffect(() => {
		// Clean up previous timing functions if they exist
		if (debouncedSetRef.current) {
			(debouncedSetRef.current as any).cancel?.();
			debouncedSetRef.current = null;
		}

		if (throttledSetRef.current) {
			(throttledSetRef.current as any).cancel?.();
			throttledSetRef.current = null;
		}

		// Set up new timing functions based on options
		if (debounceTime && debounceTime > 0) {
			debouncedSetRef.current = debounce(
				(newPresent: T) => dispatch({ type: 'SET', newPresent }),
				debounceTime,
				debounceOptions
			);
		}

		if (throttleTime && throttleTime > 0) {
			throttledSetRef.current = throttle(
				(newPresent: T) => dispatch({ type: 'SET', newPresent }),
				throttleTime,
				throttleOptions
			);
		}

		// Clean up on unmount
		return () => {
			if (debouncedSetRef.current) {
				(debouncedSetRef.current as any).cancel?.();
			}

			if (throttledSetRef.current) {
				(throttledSetRef.current as any).cancel?.();
			}
		};
	}, [debounceTime, throttleTime, debounceOptions, throttleOptions]);

	// Determine which set function to use based on options
	const set = useCallback(
		(newPresent: T) => {
			if (debouncedSetRef.current) {
				debouncedSetRef.current(newPresent);
			} else if (throttledSetRef.current) {
				throttledSetRef.current(newPresent);
			} else {
				setDirect(newPresent);
			}
		},
		[setDirect]
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
