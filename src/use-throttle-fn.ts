import { useEffect, useRef } from 'react';
import throttle from 'lodash/throttle';
import type { ThrottleSettings } from 'lodash';

const DEFAULT_DELAY = 300;

const useThrottleFn = <T extends (...args: any[]) => any>(
	fn: T,
	delay = DEFAULT_DELAY,
	options?: ThrottleSettings
) => {
	// Use ref for the callback to maintain the function identity
	const fnRef = useRef(fn);

	// Update the ref when fn changes
	useEffect(() => {
		fnRef.current = fn;
	}, [fn]);

	// Create throttled function
	const throttledFn = useRef(
		throttle(
			(...args: Parameters<T>) => {
				return fnRef.current(...args);
			},
			delay,
			options
		)
	);

	// Update throttled function when delay or options change
	useEffect(() => {
		throttledFn.current = throttle(
			(...args: Parameters<T>) => {
				return fnRef.current(...args);
			},
			delay,
			options
		);

		return () => {
			throttledFn.current.cancel();
		};
	}, [delay, options]);

	return throttledFn.current;
};

export type { ThrottleSettings };
export default useThrottleFn;
