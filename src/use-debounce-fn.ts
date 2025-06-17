import { useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';
import type { DebounceSettings } from 'lodash';

const DEFAULT_DELAY = 300;

const useDebounceFn = <T extends (...args: any[]) => any>(
	fn: T,
	delay = DEFAULT_DELAY,
	options?: DebounceSettings
) => {
	// Use ref for the callback to maintain the function identity
	const fnRef = useRef(fn);

	// Update the ref when fn changes
	useEffect(() => {
		fnRef.current = fn;
	}, [fn]);

	// Create debounced function
	const debouncedFn = useRef(
		debounce(
			(...args: Parameters<T>) => {
				return fnRef.current(...args);
			},
			delay,
			options
		)
	);

	// Update debounced function when delay or options change
	useEffect(() => {
		debouncedFn.current = debounce(
			(...args: Parameters<T>) => {
				return fnRef.current(...args);
			},
			delay,
			options
		);

		return () => {
			debouncedFn.current.cancel();
		};
	}, [delay, options]);

	return debouncedFn.current;
};

export type { DebounceSettings };
export default useDebounceFn;
