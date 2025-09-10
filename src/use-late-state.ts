import { useState, useEffect, useCallback, useRef } from 'react';

const useLate = <T>(initial: T, delay: number) => {
	const [value, setValue] = useState(initial);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const setLate = useCallback(
		(newValue: T, immediate = false) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}

			if (immediate) {
				setValue(newValue);
				return;
			}

			timeoutRef.current = setTimeout(() => {
				setValue(newValue);
				timeoutRef.current = null;
			}, delay);
		},
		[delay]
	);

	const cancel = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;

			return true;
		}
		return false;
	}, []);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
	}, []);

	return [value, setLate, cancel] as const;
};

export default useLate;
