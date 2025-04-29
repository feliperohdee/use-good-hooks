import { useState, useEffect, useRef } from 'react';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import merge from 'lodash/merge';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import qs from 'use-qs';
import size from 'lodash/size';

import { StrictObject } from '@/types';
import is from '@/is';
import useDebounce from '@/use-debounce';

type SetUrlStateAction<T> = T | ((prevState: T) => T);
type UseUrlStateOptions = {
	debounce?: number;
	kebabCase?: boolean;
	omitKeys?: string[] | ((value: any, key: string) => boolean);
	omitValues?: any[] | ((value: any, key: string) => boolean);
	onError?: (err: Error) => void;
	pickKeys?: string[] | ((value: any, key: string) => boolean);
	prefix?: string;
	url: URL;
};

const DEFAULT_DEBOUNCE = 500;

const useUrlState = <T extends StrictObject>(
	initialState: T,
	options: UseUrlStateOptions
): [T, (value: SetUrlStateAction<T>) => void] => {
	const optionsRef = useRef(options);
	const getInitialValue = (): T => {
		const {
			kebabCase = true,
			omitKeys,
			omitValues,
			onError,
			pickKeys,
			prefix = '',
			url
		} = optionsRef.current;

		if (!url.search) {
			return initialState;
		}

		try {
			let parsedState = qs.parse(decodeURIComponent(url.search), {
				case: kebabCase ? 'kebab-case' : 'camelCase',
				omitValues,
				prefix
			});

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
		} catch (err) {
			if (onError) {
				onError(err as Error);
			}

			return initialState;
		}
	};

	const [state, setState] = useState<T>(getInitialValue);
	const debouncedState = useDebounce(
		state,
		optionsRef.current.debounce ?? DEFAULT_DEBOUNCE
	);

	// Update state when url changes
	useEffect(() => {
		if (!is.browser()) {
			return;
		}

		const {
			kebabCase = true,
			omitKeys,
			omitValues,
			onError,
			pickKeys,
			prefix = ''
		} = optionsRef.current;

		try {
			let urlState = debouncedState;

			if (omitKeys && (size(omitKeys) || isFunction(omitKeys))) {
				urlState = (
					isFunction(omitKeys)
						? omitBy(urlState, omitKeys)
						: omit(urlState, omitKeys)
				) as T;
			}

			if (pickKeys && (size(pickKeys) || isFunction(pickKeys))) {
				urlState = (
					isFunction(pickKeys)
						? pickBy(urlState, pickKeys)
						: pick(urlState, pickKeys)
				) as T;
			}

			const search = qs.stringify(urlState, {
				case: kebabCase ? 'kebab-case' : 'camelCase',
				omitValues,
				prefix
			});

			if (search) {
				window.history.replaceState(
					{},
					'',
					`${window.location.pathname}${search}`
				);
			} else {
				window.history.replaceState({}, '', window.location.pathname);
			}
		} catch (err) {
			if (onError) {
				onError(err as Error);
			}
		}
	}, [debouncedState]);

	return [state, setState];
};

export default useUrlState;
