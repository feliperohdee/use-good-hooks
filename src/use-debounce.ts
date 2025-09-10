import { useState, useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';

const DEFAULT_MS = 300;
const useDebounce = <T>(value: T, ms = DEFAULT_MS): T => {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	const debounceRef = useRef(
		debounce((newValue: T) => {
			setDebouncedValue(newValue);
		}, ms)
	);

	useEffect(() => {
		debounceRef.current(value);
	}, [value]);

	// Cleanup on unmount
	useEffect(() => {
		const debounce = debounceRef.current;

		return () => {
			debounce.cancel();
		};
	}, []);

	return debouncedValue;
};

export default useDebounce;
