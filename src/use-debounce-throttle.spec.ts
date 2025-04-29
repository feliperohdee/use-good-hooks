import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useDebounce from '@/use-debounce';
import useThrottle from '@/use-throttle';

describe('/use-debounce', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return initial value immediately', () => {
		const { result } = renderHook(() => {
			return useDebounce('initial');
		});
		expect(result.current).toEqual('initial');
	});

	it('should debounce updates', () => {
		const { result, rerender } = renderHook(
			({ value }) => {
				return useDebounce(value, 500);
			},
			{ initialProps: { value: 'initial' } }
		);

		expect(result.current).toEqual('initial');

		// First update
		rerender({ value: 'update1' });
		expect(result.current).toEqual('initial'); // Value shouldn't change yet

		// Wait 250ms
		act(() => {
			vi.advanceTimersByTime(250);
		});
		expect(result.current).toEqual('initial'); // Still unchanged

		// Update again before timeout
		rerender({ value: 'update2' });
		expect(result.current).toEqual('initial'); // Still unchanged

		// Wait another 250ms (total 500ms since last update)
		act(() => {
			vi.advanceTimersByTime(250);
		});
		expect(result.current).toEqual('initial'); // Still unchanged because timer was reset

		// Complete the full delay for the last update
		act(() => {
			vi.advanceTimersByTime(250);
		});
		expect(result.current).toEqual('update2'); // Now updated to the last value
	});

	it('should cancel previous debounce on rapid updates', () => {
		const { result, rerender } = renderHook(
			({ value }) => {
				return useDebounce(value, 500);
			},
			{
				initialProps: { value: 'initial' }
			}
		);

		// Multiple rapid updates
		rerender({ value: 'update1' });
		rerender({ value: 'update2' });
		rerender({ value: 'update3' });

		// Advance time partially
		act(() => {
			vi.advanceTimersByTime(250);
		});
		expect(result.current).toEqual('initial');

		// Complete the delay
		act(() => {
			vi.advanceTimersByTime(250);
		});
		expect(result.current).toEqual('update3');
	});

	it('should handle rapid successive updates', () => {
		const { result, rerender } = renderHook(
			({ value }) => {
				return useDebounce(value, 500);
			},
			{ initialProps: { value: 'initial' } }
		);

		// Rapid successive updates
		rerender({ value: 'update1' });
		rerender({ value: 'update2' });
		rerender({ value: 'update3' });
		expect(result.current).toEqual('initial');

		// Advance almost to timeout
		act(() => {
			vi.advanceTimersByTime(499);
		});
		expect(result.current).toEqual('initial');

		// Complete timeout
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current).toEqual('update3');

		// New update after delay should start new timer
		rerender({ value: 'update4' });
		expect(result.current).toEqual('update3');

		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(result.current).toEqual('update4');
	});
});

describe('/app/use-throttle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return initial value immediately', () => {
		const { result } = renderHook(() => {
			return useThrottle('initial');
		});
		expect(result.current).toEqual('initial');
	});

	it('should throttle value updates', () => {
		const { result, rerender } = renderHook(
			({ value }) => {
				return useThrottle(value, 500);
			},
			{ initialProps: { value: 'initial' } }
		);

		// Initial value should be set immediately
		expect(result.current).toEqual('initial');

		act(() => {
			vi.advanceTimersByTime(500);
		});

		// First update should happen immediately due to lodash throttle behavior
		rerender({ value: 'update1' });
		expect(result.current).toEqual('update1');

		// Subsequent updates within the delay window should be ignored
		rerender({ value: 'update2' });
		rerender({ value: 'update3' });
		expect(result.current).toEqual('update1');

		// Advance time partially - value should not change
		act(() => {
			vi.advanceTimersByTime(250);
		});
		expect(result.current).toEqual('update1');

		// Complete the delay - last value in the window should be applied
		act(() => {
			vi.advanceTimersByTime(250);
		});
		expect(result.current).toEqual('update3');

		// New update after delay should happen immediately
		rerender({ value: 'update4' });
		expect(result.current).toEqual('update4');
	});

	it('should handle multiple throttle windows correctly', () => {
		const { result, rerender } = renderHook(
			({ value }) => {
				return useThrottle(value, 500);
			},
			{ initialProps: { value: 'initial' } }
		);

		// First window
		act(() => {
			vi.advanceTimersByTime(500);
		});

		rerender({ value: 'update1' });
		expect(result.current).toEqual('update1');

		rerender({ value: 'update2' });
		expect(result.current).toEqual('update1');

		// Complete first window
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(result.current).toEqual('update2');

		// Start second window
		rerender({ value: 'update3' });
		expect(result.current).toEqual('update3');

		rerender({ value: 'update4' });
		expect(result.current).toEqual('update3');

		// Complete second window
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(result.current).toEqual('update4');
	});
});
