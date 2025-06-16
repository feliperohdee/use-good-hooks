import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDebounceFn from '@/use-debounce-fn';

describe('/use-debounce-fn', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return a function with cancel and flush methods', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => {
			return useDebounceFn(fn, 500);
		});

		expect(typeof result.current).toEqual('function');
		expect(typeof result.current.cancel).toEqual('function');
		expect(typeof result.current.flush).toEqual('function');
	});

	it('should debounce function calls', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => {
			return useDebounceFn(fn, 500);
		});

		// Call the function multiple times
		result.current(1, 2, 3);
		result.current(4, 5, 6);
		result.current(7, 8, 9);

		// Function should not be called yet
		expect(fn).not.toHaveBeenCalled();

		// Advance time partially
		act(() => {
			vi.advanceTimersByTime(250);
		});

		// Function still should not be called
		expect(fn).not.toHaveBeenCalled();

		// Complete the delay
		act(() => {
			vi.advanceTimersByTime(250);
		});

		// Function should now be called with the last arguments
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenLastCalledWith(7, 8, 9);
	});

	it('should cancel debounced calls', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => {
			return useDebounceFn(fn, 500);
		});

		// Call the function
		result.current(1, 2, 3);

		// Cancel the call
		result.current.cancel();

		// Advance time completely
		act(() => {
			vi.advanceTimersByTime(500);
		});

		// Function should not have been called
		expect(fn).not.toHaveBeenCalled();
	});

	it('should flush debounced calls immediately', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => {
			return useDebounceFn(fn, 500);
		});

		// Call the function
		result.current(1, 2, 3);

		// Function has not been called yet
		expect(fn).not.toHaveBeenCalled();

		// Flush the call
		result.current.flush();

		// Function should be called immediately
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(1, 2, 3);
	});

	it('should use the latest function reference', () => {
		const fn1 = vi.fn();
		const fn2 = vi.fn();

		const { result, rerender } = renderHook(
			({ fn }) => {
				return useDebounceFn(fn, 500);
			},
			{ initialProps: { fn: fn1 } }
		);

		// Call the debounced function
		result.current(1, 2, 3);

		// Update the function reference
		rerender({ fn: fn2 });

		// Complete the delay
		act(() => {
			vi.advanceTimersByTime(500);
		});

		// The latest function should be called
		expect(fn1).not.toHaveBeenCalled();
		expect(fn2).toHaveBeenCalledTimes(1);
		expect(fn2).toHaveBeenCalledWith(1, 2, 3);
	});
});
