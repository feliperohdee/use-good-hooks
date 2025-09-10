import { useEffect, useRef, useState } from 'react';

const useTemporaryState = <T>(initialState: T, ms: number) => {
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [state, setState] = useState(initialState);

	useEffect(() => {
		clearTimeout(timeoutRef.current!);
		timeoutRef.current = setTimeout(() => {
			setState(initialState);
		}, ms);

		return () => {
			clearTimeout(timeoutRef.current!);
		};
	}, [initialState, state, ms]);

	return [state, setState] as const;
};

export default useTemporaryState;
