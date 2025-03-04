import { useEffect, useRef } from 'react';

const usePrev = <T>(value: T): T | undefined => {
	const prevValueRef = useRef<T>(undefined);

	useEffect(() => {
		prevValueRef.current = value;
	});

	return prevValueRef.current;
};

export default usePrev;
