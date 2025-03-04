import { useState, useEffect, useRef } from 'react';
import throttle from 'lodash/throttle';

const DEFAULT_DELAY = 300;
const useThrottle = <T>(value: T, delay = DEFAULT_DELAY): T => {
	const [throttledValue, setThrottledValue] = useState<T>(value);
	const throttleRef = useRef(
		throttle((newValue: T) => {
			setThrottledValue(newValue);
		}, delay)
	);

	useEffect(() => {
		throttleRef.current(value);
	}, [value]);

	// Cleanup on unmount
	useEffect(() => {
		const throttle = throttleRef.current;

		return () => {
			throttle.cancel();
		};
	}, []);

	return throttledValue;
};

export default useThrottle;
