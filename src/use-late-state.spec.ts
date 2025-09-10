import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useLate from '@/use-late-state';

describe('/use-late-state', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('basic functionality', () => {
		it('should return initial state', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			expect(result.current[0]).toEqual('initial');
		});

		it('should return setLate and cancel functions', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			expect(typeof result.current[1]).toEqual('function');
			expect(typeof result.current[2]).toEqual('function');
		});

		it('should update state immediately when immediate=true', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			act(() => {
				result.current[1]('updated', true);
			});

			expect(result.current[0]).toEqual('updated');
		});

		it('should update state after delay when immediate=false', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			act(() => {
				result.current[1]('updated', false);
			});

			// State should not change immediately
			expect(result.current[0]).toEqual('initial');

			// Advance time by the delay
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// State should now be updated
			expect(result.current[0]).toEqual('updated');
		});
	});

	describe('delayed updates', () => {
		it('should clear previous timeout when new update is scheduled', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			// Schedule first update
			act(() => {
				result.current[1]('first update');
			});

			// Schedule second update before first completes
			act(() => {
				result.current[1]('second update');
			});

			// Advance time to when second update should occur (from when it was scheduled)
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Should now be second update (first was cancelled, second fired)
			expect(result.current[0]).toEqual('second update');
		});

		it('should handle multiple rapid updates', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			// Schedule multiple updates rapidly
			act(() => {
				result.current[1]('update 1');
				result.current[1]('update 2');
				result.current[1]('update 3');
			});

			// Advance time by less than delay
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Should still be initial
			expect(result.current[0]).toEqual('initial');

			// Complete the delay
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Should be the last update
			expect(result.current[0]).toEqual('update 3');
		});

		it('should handle mixed immediate and delayed updates', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			// Schedule delayed update
			act(() => {
				result.current[1]('delayed update');
			});

			// Schedule immediate update
			act(() => {
				result.current[1]('immediate update', true);
			});

			// Should be immediate update
			expect(result.current[0]).toEqual('immediate update');

			// Advance time to when delayed update would have occurred
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Should still be immediate update (delayed was cancelled)
			expect(result.current[0]).toEqual('immediate update');
		});
	});

	describe('cancel functionality', () => {
		it('should cancel pending delayed update', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			// Schedule delayed update
			act(() => {
				result.current[1]('delayed update');
			});

			// Cancel the update
			act(() => {
				const cancelled = result.current[2]();
				expect(cancelled).toBe(true);
			});

			// Advance time by the delay
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Should still be initial
			expect(result.current[0]).toEqual('initial');
		});

		it('should return false when no pending update to cancel', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			// Try to cancel when no update is pending
			act(() => {
				const cancelled = result.current[2]();
				expect(cancelled).toBe(false);
			});

			// State should remain unchanged
			expect(result.current[0]).toEqual('initial');
		});

		it('should return false when cancelling after update has already occurred', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			// Schedule delayed update
			act(() => {
				result.current[1]('delayed update');
			});

			// Let the update complete
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Try to cancel after update has occurred
			act(() => {
				const cancelled = result.current[2]();
				expect(cancelled).toBe(false);
			});

			// State should be updated
			expect(result.current[0]).toEqual('delayed update');
		});

		it('should cancel immediate update if called before state update', () => {
			const { result } = renderHook(() => {
				return useLate('initial', 1000);
			});

			// Schedule immediate update
			act(() => {
				result.current[1]('immediate update', true);
			});

			// State should be updated immediately
			expect(result.current[0]).toEqual('immediate update');

			// Try to cancel (should return false since no timeout was set)
			act(() => {
				const cancelled = result.current[2]();
				expect(cancelled).toBe(false);
			});
		});
	});

	describe('cleanup', () => {
		it('should clear timeout on unmount', () => {
			const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

			const { result, unmount } = renderHook(() => {
				return useLate('initial', 1000);
			});

			// Schedule an update
			act(() => {
				result.current[1]('updated');
			});

			// Unmount the hook
			act(() => {
				unmount();
			});

			expect(clearTimeoutSpy).toHaveBeenCalled();
		});
	});
});
