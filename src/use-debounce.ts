import { useState, useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';

const DEFAULT_DELAY = 300;
const useDebounce = <T>(value: T, delay = DEFAULT_DELAY): T => {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	const debounceRef = useRef(
		debounce((newValue: T) => {
			setDebouncedValue(newValue);
		}, delay)
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
