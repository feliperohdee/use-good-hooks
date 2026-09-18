import { useEffect, useRef } from 'react';

const useUnmount = (fn: () => void) => {
	const fnRef = useRef(fn);
	const unmountedRef = useRef(false);

	useEffect(() => {
		fnRef.current = fn;
	}, [fn]);

	useEffect(() => {
		unmountedRef.current = false;

		return () => {
			unmountedRef.current = true;

			queueMicrotask(() => {
				if (!unmountedRef.current) {
					return;
				}

				fnRef.current();
			});
		};
	}, []);
};

export default useUnmount;
