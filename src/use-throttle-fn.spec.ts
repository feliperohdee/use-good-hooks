import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useThrottleFn from '@/use-throttle-fn';

describe('/use-throttle-fn', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return a function with cancel and flush methods', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => {
			return useThrottleFn(fn, 500);
		});

		expect(typeof result.current).toEqual('function');
		expect(typeof result.current.cancel).toEqual('function');
		expect(typeof result.current.flush).toEqual('function');
	});

	it('should throttle function calls', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => {
			return useThrottleFn(fn, 500);
		});

		// First call should execute immediately
		result.current(1, 2, 3);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(1, 2, 3);

		// Reset the mock
		fn.mockReset();

		// Subsequent calls within the timeout window should be ignored
		result.current(4, 5, 6);
		result.current(7, 8, 9);
		expect(fn).not.toHaveBeenCalled();

		// Advance time partially
		act(() => {
			vi.advanceTimersByTime(250);
		});

		// Still within the timeout window
		expect(fn).not.toHaveBeenCalled();

		// Complete the delay
		act(() => {
			vi.advanceTimersByTime(250);
		});

		// Should call with the most recent arguments
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(7, 8, 9);
	});

	it('should cancel throttled calls', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => {
			return useThrottleFn(fn, 500);
		});

		// First call executes immediately
		result.current(1, 2, 3);
		expect(fn).toHaveBeenCalledTimes(1);

		// Reset the mock
		fn.mockReset();

		// Make another call - this should be throttled
		result.current(4, 5, 6);
		expect(fn).not.toHaveBeenCalled();

		// Cancel the call
		result.current.cancel();

		// Advance time completely
		act(() => {
			vi.advanceTimersByTime(500);
		});

		// Function should not have been called again
		expect(fn).not.toHaveBeenCalled();
	});

	it('should flush throttled calls immediately', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => {
			return useThrottleFn(fn, 500);
		});

		// First call executes immediately
		result.current(1, 2, 3);
		expect(fn).toHaveBeenCalledTimes(1);

		// Reset the mock
		fn.mockReset();

		// Make a call that will be throttled
		result.current(4, 5, 6);
		expect(fn).not.toHaveBeenCalled();

		// Flush the call
		result.current.flush();

		// Function should be called immediately
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(4, 5, 6);
	});

	it('should use the latest function reference', () => {
		const fn1 = vi.fn();
		const fn2 = vi.fn();

		const { result, rerender } = renderHook(
			({ fn }) => {
				return useThrottleFn(fn, 500);
			},
			{ initialProps: { fn: fn1 } }
		);

		// First call with fn1
		result.current(1, 2, 3);
		expect(fn1).toHaveBeenCalledTimes(1);

		// Reset the mocks
		fn1.mockReset();

		// Make a call that will be throttled
		result.current(4, 5, 6);

		// Update the function reference
		rerender({ fn: fn2 });

		// Complete the delay
		act(() => {
			vi.advanceTimersByTime(500);
		});

		// The latest function should be called
		expect(fn1).not.toHaveBeenCalled();
		expect(fn2).toHaveBeenCalledTimes(1);
		expect(fn2).toHaveBeenCalledWith(4, 5, 6);
	});
});
