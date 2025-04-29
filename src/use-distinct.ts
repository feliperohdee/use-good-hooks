import { useState, useEffect, useRef, useCallback } from 'react';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import isFunction from 'lodash/isFunction';

type UseDistinctReturn<T> = {
	distinct: boolean;
	prevValue: T | undefined;
	value: T;
};

type UseDistinctOptions = {
	compare?: (a: any, b: any) => boolean;
	debounce?: number;
	deep?: boolean;
};

const strictEqual = (a: any, b: any) => {
	return a === b;
};

const useDistinct = <T>(
	inputValue: T,
	options: UseDistinctOptions = {}
): UseDistinctReturn<T> => {
	const mustReset = useRef(false);
	const optionsRef = useRef(options);
	const prevDistinctValueRef = useRef<T>(inputValue);
	const debounceRef = useRef(
		debounce((newValue: T) => {
			const { compare, deep } = optionsRef.current;
			const equal = isFunction(compare)
				? compare
				: deep
					? isEqual
					: strictEqual;
			const distinct = !equal(newValue, prevDistinctValueRef.current);

			if (distinct) {
				setState({
					distinct: true,
					prevValue: prevDistinctValueRef.current,
					value: newValue
				});

				prevDistinctValueRef.current = newValue;
			}
		}, optionsRef.current.debounce ?? 0)
	);

	const [state, setState] = useState<{
		distinct: boolean;
		prevValue: T | undefined;
		value: T;
	}>({
		distinct: false,
		prevValue: undefined,
		value: inputValue
	});

	const resetDistinct = useCallback(() => {
		mustReset.current = false;

		setState(state => {
			return {
				...state,
				distinct: false
			};
		});
	}, []);

	// this useEffect is debounced, so it will only run when the inputValue changes
	useEffect(() => {
		// First must reset distinct
		if (state.distinct && mustReset.current) {
			resetDistinct();
			return;
		}

		// Calc distinct
		const debounce = debounceRef.current;
		debounce(inputValue);
	});

	// Allow reset on next render
	useEffect(() => {
		if (!state.distinct) {
			return;
		}

		mustReset.current = true;
	}, [state.distinct]);

	// Cleanup on unmount
	useEffect(() => {
		const debounce = debounceRef.current;

		return () => {
			debounce.cancel();
		};
	}, []);

	return state;
};

export default useDistinct;
