import { useState, useEffect, useRef } from 'react';
import throttle from 'lodash/throttle';

const DEFAULT_MS = 300;
const useThrottle = <T>(value: T, ms = DEFAULT_MS): T => {
	const [throttledValue, setThrottledValue] = useState<T>(value);
	const throttleRef = useRef(
		throttle((newValue: T) => {
			setThrottledValue(newValue);
		}, ms)
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
