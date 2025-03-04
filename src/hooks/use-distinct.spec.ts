import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useDistinct from '@/hooks/use-distinct';

describe('/hooks/use-distinct', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('basic functionality', () => {
		it('should return initial state and changed flag', () => {
			const { result } = renderHook(() => {
				return useDistinct('initial');
			});
			expect(result.current).toEqual({
				distinct: false,
				prevDistinctValue: undefined,
				value: 'initial'
			});
		});

		it('should handle primitive value updates', () => {
			const { result, rerender } = renderHook(
				({ state }) => {
					return useDistinct(state);
				},
				{ initialProps: { state: 1 } }
			);

			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: 1
			});

			rerender({ state: 1 }); // Same value
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: 1
			});

			rerender({ state: 2 }); // Different value
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: true,
				prevValue: 1,
				value: 2
			});

			rerender({ state: 2 }); // Distinct flag should reset on next render
			expect(result.current).toEqual({
				distinct: false,
				prevValue: 1,
				value: 2
			});
		});

		it('should handle null and undefined values', () => {
			const { result, rerender } = renderHook(
				({ state }) => {
					return useDistinct(state);
				},
				{ initialProps: { state: null } }
			);

			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: null
			});

			rerender({ state: null }); // Same value
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: null
			});

			// @ts-expect-error
			rerender({ state: undefined }); // Different value
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: true,
				prevValue: null,
				value: undefined
			});

			// @ts-expect-error
			rerender({ state: undefined }); // Distinct flag should reset on next render
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: null,
				value: undefined
			});
		});
	});

	describe('strict comparison', () => {
		it('should return new state when it changes using strict comparison', () => {
			const initialObj = { nested: { value: 1 } };
			const newEqualObj = { nested: { value: 1 } };

			const { result, rerender } = renderHook(
				({ state }) => {
					return useDistinct(state);
				},
				{ initialProps: { state: initialObj } }
			);

			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: initialObj
			});

			rerender({ state: initialObj }); // Same value, same reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: initialObj
			});

			rerender({ state: newEqualObj }); // Same value, different reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: true,
				prevValue: initialObj,
				value: newEqualObj
			});

			rerender({ state: newEqualObj }); // Distinct flag should reset on next render
			expect(result.current).toEqual({
				distinct: false,
				prevValue: initialObj,
				value: newEqualObj
			});
		});

		it('should not keep reference when value is equal using strict comparison', () => {
			const initialObj = { nested: { value: 1 } };
			const newEqualObj = { nested: { value: 1 } };

			const { result, rerender } = renderHook(
				({ state }) => {
					return useDistinct(state);
				},
				{ initialProps: { state: initialObj } }
			);

			const resultRef = result.current.value;

			rerender({ state: newEqualObj });
			act(() => {
				vi.runAllTimers();
			});

			expect(result.current.value).not.toBe(resultRef);
		});
	});

	describe('deep comparison mode', () => {
		it('should return new state when it changes using deep comparison', () => {
			const initialObj = { nested: { value: 1 } };
			const newEqualObj = { nested: { value: 1 } };
			const newDifferentObj = { nested: { value: 2 } };

			const { result, rerender } = renderHook(
				({ state }) => {
					return useDistinct(state, { deep: true });
				},
				{ initialProps: { state: initialObj } }
			);

			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: initialObj
			});

			rerender({ state: initialObj }); // Same value, same reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: initialObj
			});

			rerender({ state: newEqualObj }); // Same value, different reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: initialObj
			});

			rerender({ state: newDifferentObj }); // Different value, different reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: true,
				prevValue: initialObj,
				value: newDifferentObj
			});

			rerender({ state: newDifferentObj }); // Distinct flag should reset on next render
			expect(result.current).toEqual({
				distinct: false,
				prevValue: initialObj,
				value: newDifferentObj
			});
		});

		it('should keep reference when value is equal using deep comparison', () => {
			const initialObj = { nested: { value: 1 } };
			const newEqualObj = { nested: { value: 1 } };
			const newDifferentObj = { nested: { value: 2 } };

			const { result, rerender } = renderHook(
				({ state }) => {
					return useDistinct(state, { deep: true });
				},
				{ initialProps: { state: initialObj } }
			);

			const resultRef = result.current.value;

			rerender({ state: newEqualObj }); // Same value, different reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current.value).toBe(resultRef);

			rerender({ state: newDifferentObj }); // Different value, different reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current.value).not.toBe(resultRef);
		});

		it('should handle array updates with deep comparison', () => {
			const initialArray = [1, 2, 3];
			const newEqualArray = [1, 2, 3];
			const newDifferentArray = [1, 2, 3, 4];

			const { result, rerender } = renderHook(
				({ state }) => {
					return useDistinct(state, { deep: true });
				},
				{ initialProps: { state: initialArray } }
			);

			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: initialArray
			});

			rerender({ state: initialArray }); // Same value, same reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: initialArray
			});

			rerender({ state: newEqualArray }); // Same value, different reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: initialArray
			});

			rerender({ state: newDifferentArray }); // Different value, different reference
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: true,
				prevValue: initialArray,
				value: newDifferentArray
			});

			rerender({ state: newDifferentArray }); // Distinct flag should reset on next render
			expect(result.current).toEqual({
				distinct: false,
				prevValue: initialArray,
				value: newDifferentArray
			});
		});
	});

	describe('custom comparison', () => {
		it('should use custom compare function when provided', () => {
			const customCompare = (a: number, b: number) => {
				return Math.floor(a) === Math.floor(b);
			};

			const { result, rerender } = renderHook(
				({ value }) => {
					return useDistinct(value, { compare: customCompare });
				},
				{
					initialProps: { value: 1.1 }
				}
			);

			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: 1.1
			});

			rerender({ value: 1.9 }); // Same value
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: 1.1
			});

			rerender({ value: 2.1 }); // Different value
			act(() => {
				vi.runAllTimers();
			});
			expect(result.current).toEqual({
				distinct: true,
				prevValue: 1.1,
				value: 2.1
			});

			rerender({ value: 2.1 }); // Distinct flag should reset on next render
			expect(result.current).toEqual({
				distinct: false,
				prevValue: 1.1,
				value: 2.1
			});
		});
	});

	describe('debounce', () => {
		it('should handle multiple rapid updates within debounce period', async () => {
			const { result, rerender } = renderHook(
				({ state }) => {
					return useDistinct(state, { debounce: 1000 });
				},
				{
					initialProps: { state: 'initial' }
				}
			);

			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: 'initial'
			});

			rerender({ state: 'change1' }); // Still initial
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: 'initial'
			});

			rerender({ state: 'change2' }); // Still initial
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(result.current).toEqual({
				distinct: false,
				prevValue: undefined,
				value: 'initial'
			});

			rerender({ state: 'final' }); // Only the last value is applied
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(result.current).toEqual({
				distinct: true,
				prevValue: 'initial',
				value: 'final'
			});

			rerender({ state: 'final' }); // Distinct flag should reset on next render
			expect(result.current).toEqual({
				distinct: false,
				prevValue: 'initial',
				value: 'final'
			});
		});
	});
});
