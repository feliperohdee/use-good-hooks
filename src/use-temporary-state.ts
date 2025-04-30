import { useEffect, useRef, useState } from 'react';

const useTemporaryState = <T>(initialState: T, timeout: number) => {
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [state, setState] = useState(initialState);

	useEffect(() => {
		clearTimeout(timeoutRef.current!);
		timeoutRef.current = setTimeout(() => {
			setState(initialState);
		}, timeout);

		return () => {
			clearTimeout(timeoutRef.current!);
		};
	}, [initialState, state, timeout]);

	return [state, setState] as const;
};

export default useTemporaryState;
