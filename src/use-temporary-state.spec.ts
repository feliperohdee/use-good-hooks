import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Dispatch, SetStateAction } from 'react';
import { renderHook, act } from '@testing-library/react';

import useTemporaryState from '@/use-temporary-state';

describe('/use-temporary-state', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('basic functionality', () => {
		it('should return initial state', () => {
			const { result } = renderHook(() =>
				useTemporaryState('initial', 1000)
			);

			expect(result.current[0]).toEqual('initial');
		});

		it('should allow changing the state', () => {
			const { result } = renderHook(() =>
				useTemporaryState('initial', 1000)
			);

			act(() => {
				const setState = result.current[1] as Dispatch<
					SetStateAction<string>
				>;
				setState('updated');
			});

			expect(result.current[0]).toEqual('updated');
		});

		it('should reset to initial state after timeout', () => {
			const { result } = renderHook(() =>
				useTemporaryState('initial', 1000)
			);

			act(() => {
				const setState = result.current[1] as Dispatch<
					SetStateAction<string>
				>;
				setState('updated');
			});

			expect(result.current[0]).toEqual('updated');

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(result.current[0]).toEqual('initial');
		});

		it('should clear previous timeout when state changes again', () => {
			const { result } = renderHook(() =>
				useTemporaryState('initial', 1000)
			);

			act(() => {
				const setState = result.current[1] as Dispatch<
					SetStateAction<string>
				>;
				setState('first update');
			});

			act(() => {
				vi.advanceTimersByTime(500); // Advance halfway through timeout
			});

			act(() => {
				const setState = result.current[1] as Dispatch<
					SetStateAction<string>
				>;
				setState('second update');
			});

			act(() => {
				vi.advanceTimersByTime(500); // Advance to what would've been the first timeout
			});

			// First timeout should be cleared, so still on second update
			expect(result.current[0]).toEqual('second update');

			act(() => {
				vi.advanceTimersByTime(500); // Complete the second timeout
			});

			expect(result.current[0]).toEqual('initial');
		});

		it('should handle changing the initial state', () => {
			const { result, rerender } = renderHook(
				({ initialValue }) => useTemporaryState(initialValue, 1000),
				{ initialProps: { initialValue: 'first initial' } }
			);

			expect(result.current[0]).toEqual('first initial');

			act(() => {
				const setState = result.current[1] as Dispatch<
					SetStateAction<string>
				>;
				setState('updated');
			});

			expect(result.current[0]).toEqual('updated');

			// Change the initial value
			rerender({ initialValue: 'new initial' });

			// Should still be 'updated' until timeout
			expect(result.current[0]).toEqual('updated');

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Should reset to the new initial value
			expect(result.current[0]).toEqual('new initial');
		});

		it('should handle changing the timeout duration', () => {
			const { result, rerender } = renderHook(
				({ timeout }) => useTemporaryState('initial', timeout),
				{ initialProps: { timeout: 1000 } }
			);

			act(() => {
				const setState = result.current[1] as Dispatch<
					SetStateAction<string>
				>;
				setState('updated');
			});

			expect(result.current[0]).toEqual('updated');

			// Change the timeout to a longer duration
			rerender({ timeout: 2000 });

			// Original timeout would have expired, but new one is longer
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Should still be in updated state
			expect(result.current[0]).toEqual('updated');

			// Complete the new timeout
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Should now reset to initial
			expect(result.current[0]).toEqual('initial');
		});
	});

	describe('with different data types', () => {
		it('should work with number values', () => {
			const { result } = renderHook(() => useTemporaryState(0, 1000));

			act(() => {
				const setState = result.current[1] as Dispatch<
					SetStateAction<number>
				>;
				setState(42);
			});

			expect(result.current[0]).toBe(42);

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(result.current[0]).toBe(0);
		});

		it('should work with object values', () => {
			const initialObj = { name: 'initial' };
			const { result } = renderHook(() =>
				useTemporaryState(initialObj, 1000)
			);

			const updatedObj = { name: 'updated' };
			act(() => {
				const setState = result.current[1] as Dispatch<
					SetStateAction<typeof initialObj>
				>;
				setState(updatedObj);
			});

			expect(result.current[0]).toEqual(updatedObj);

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(result.current[0]).toEqual(initialObj);
		});
	});

	describe('cleanup', () => {
		it('should clear timeout on unmount', () => {
			const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

			const { unmount } = renderHook(() =>
				useTemporaryState('initial', 1000)
			);

			act(() => {
				unmount();
			});

			expect(clearTimeoutSpy).toHaveBeenCalled();
		});
	});
});
