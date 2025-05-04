import { useCallback, useState, useEffect, useRef } from 'react';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import isMap from 'lodash/isMap';
import isSet from 'lodash/isSet';
import JSON from 'use-json';
import merge from 'lodash/merge';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import size from 'lodash/size';

import { StrictObject } from '@/types';
import is from '@/is';
import useDebounce from '@/use-debounce';

type StorageType = 'local' | 'session';
type UseStorageStateOptions = {
	debounce?: number;
	onError?: (err: Error) => void;
	omitKeys?: string[] | ((value: any, key: string) => boolean);
	pickKeys?: string[] | ((value: any, key: string) => boolean);
	storage?: StorageType;
};

const DEFAULT_DEBOUNCE = 500;
const DEFAULT_STORAGE = 'local';

const jsonReplacer = (key: string, value: any) => {
	if (isMap(value)) {
		return {
			__type: 'Map',
			value: Array.from(value.entries())
		};
	}

	if (isSet(value)) {
		return {
			__type: 'Set',
			value: Array.from(value)
		};
	}

	return value;
};

const jsonReviver = (key: string, value: any) => {
	if (value && value.__type === 'Map') {
		return new Map(value.value);
	}

	if (value && value.__type === 'Set') {
		return new Set(value.value);
	}

	return value;
};

const useStorageState = <T extends StrictObject>(
	key: string,
	initialState: T,
	options?: UseStorageStateOptions
): [
	T,
	(value: T | ((prev: T) => T)) => void,
	{
		removeKey: () => void;
	}
] => {
	const optionsRef = useRef(options || {});
	const getInitialValue = (): T => {
		const {
			storage = DEFAULT_STORAGE,
			omitKeys,
			onError,
			pickKeys
		} = optionsRef.current;

		try {
			const storageApi =
				storage === 'local' ? localStorage : sessionStorage;
			const storedState = storageApi?.getItem(key);

			if (storedState) {
				let parsedState = JSON.parse(storedState, jsonReviver);

				if (omitKeys && (size(omitKeys) || isFunction(omitKeys))) {
					parsedState = isFunction(omitKeys)
						? omitBy(parsedState, omitKeys)
						: omit(parsedState, omitKeys);
				}

				if (pickKeys && (size(pickKeys) || isFunction(pickKeys))) {
					parsedState = isFunction(pickKeys)
						? pickBy(parsedState, pickKeys)
						: pick(parsedState, pickKeys);
				}

				return isEmpty(parsedState)
					? initialState
					: merge({}, initialState, parsedState);
			}
		} catch (err) {
			if (onError) {
				onError(err as Error);
			}
		}

		return initialState;
	};

	const [state, setState] = useState<T>(getInitialValue);
	const debouncedState = useDebounce(
		state,
		optionsRef.current.debounce ?? DEFAULT_DEBOUNCE
	);

	// Update storage when state changes
	useEffect(() => {
		if (!is.browser()) {
			return;
		}

		const {
			storage = DEFAULT_STORAGE,
			onError,
			omitKeys,
			pickKeys
		} = optionsRef.current;
		const storageApi = storage === 'local' ? localStorage : sessionStorage;

		if (!storageApi) {
			return;
		}

		try {
			let persistState = debouncedState;

			if (omitKeys && (size(omitKeys) || isFunction(omitKeys))) {
				persistState = (
					isFunction(omitKeys)
						? omitBy(persistState, omitKeys)
						: omit(persistState, omitKeys)
				) as T;
			}

			if (pickKeys && (size(pickKeys) || isFunction(pickKeys))) {
				persistState = (
					isFunction(pickKeys)
						? pickBy(persistState, pickKeys)
						: pick(persistState, pickKeys)
				) as T;
			}

			const currentStorageState = storageApi.getItem(key);
			const newStorageState = JSON.stringify(persistState, jsonReplacer);

			if (currentStorageState !== newStorageState) {
				storageApi.setItem(key, newStorageState);
			}
		} catch (err) {
			if (onError) {
				onError(err as Error);
			}
		}
	}, [key, debouncedState]);

	// Remove key from storage
	const removeKey = useCallback(() => {
		if (!is.browser()) {
			return;
		}
		setState(initialState);

		const { storage = DEFAULT_STORAGE } = optionsRef.current;
		const storageApi = storage === 'local' ? localStorage : sessionStorage;

		storageApi?.removeItem(key);
	}, [key, initialState]);

	return [state, setState, { removeKey }];
};

export { jsonReplacer, jsonReviver };
export default useStorageState;
