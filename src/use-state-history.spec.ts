import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import size from 'lodash/size';

import useStateHistory from './use-state-history';

describe('/use-state-history', () => {
	it('should initialize with the initial value', () => {
		const { result } = renderHook(() => {
			return useStateHistory({ count: 0 });
		});

		expect(result.current.state).toEqual({ count: 0 });
		expect(result.current.canUndo).toEqual(false);
		expect(result.current.canRedo).toEqual(false);
	});

	it('should update the state and store history', () => {
		const { result } = renderHook(() => {
			return useStateHistory({ count: 0 });
		});

		act(() => {
			result.current.set({ count: 1 });
		});

		expect(result.current.state).toEqual({ count: 1 });
		expect(result.current.canUndo).toEqual(true);
		expect(result.current.canRedo).toEqual(false);
		expect(result.current.history.past).toEqual([{ count: 0 }]);
	});

	it('should undo changes', () => {
		const { result } = renderHook(() => {
			return useStateHistory({ count: 0 });
		});

		act(() => {
			result.current.set({ count: 1 });
			result.current.set({ count: 2 });
		});

		expect(result.current.state).toEqual({ count: 2 });

		act(() => {
			result.current.undo();
		});

		expect(result.current.state).toEqual({ count: 1 });
		expect(result.current.canUndo).toEqual(true);
		expect(result.current.canRedo).toEqual(true);
		expect(result.current.history.past).toEqual([{ count: 0 }]);
		expect(result.current.history.future).toEqual([{ count: 2 }]);
	});

	it('should redo changes', () => {
		const { result } = renderHook(() => {
			return useStateHistory({ count: 0 });
		});

		act(() => {
			result.current.set({ count: 1 });
			result.current.set({ count: 2 });
		});

		expect(result.current.state).toEqual({ count: 2 });

		act(() => {
			result.current.undo();
		});

		expect(result.current.state).toEqual({ count: 1 });

		act(() => {
			result.current.redo();
		});

		expect(result.current.state).toEqual({ count: 2 });
		expect(result.current.canUndo).toEqual(true);
		expect(result.current.canRedo).toEqual(false);
	});

	it('should clear history', () => {
		const { result } = renderHook(() => {
			return useStateHistory({ count: 0 });
		});

		act(() => {
			result.current.set({ count: 1 });
			result.current.set({ count: 2 });
			result.current.clear();
		});

		expect(result.current.state).toEqual({ count: 0 });
		expect(result.current.canUndo).toEqual(false);
		expect(result.current.canRedo).toEqual(false);
		expect(result.current.history.past).toEqual([]);
		expect(result.current.history.future).toEqual([]);
	});

	it('should respect maxCapacity', () => {
		// Use a maxCapacity of 2
		const { result } = renderHook(() =>
			useStateHistory({ count: 0 }, { maxCapacity: 2 })
		);

		// Add 3 states (initial + 3 new ones)
		act(() => {
			result.current.set({ count: 1 });
		});

		// We should have 1 past state
		expect(result.current.history.past).toEqual([{ count: 0 }]);

		act(() => {
			result.current.set({ count: 2 });
		});

		// We should now have 2 past states
		expect(result.current.history.past).toEqual([
			{ count: 0 },
			{ count: 1 }
		]);

		act(() => {
			result.current.set({ count: 3 });
		});

		// We've exceeded capacity, should drop the oldest state
		expect(result.current.state).toEqual({ count: 3 });
		expect(result.current.history.past).toEqual([
			{ count: 1 },
			{ count: 2 }
		]);
		expect(size(result.current.history.past)).toEqual(2);

		act(() => {
			result.current.set({ count: 4 });
		});

		// Should continue to drop the oldest state when adding a new one
		expect(result.current.history.past).toEqual([
			{ count: 2 },
			{ count: 3 }
		]);
		expect(size(result.current.history.past)).toEqual(2);
	});

	it('should perform deep copies to avoid reference issues', () => {
		const initialObject = { nested: { value: 0 } };
		const { result } = renderHook(() => useStateHistory(initialObject));

		const newObject = { nested: { value: 1 } };

		act(() => {
			result.current.set(newObject);
		});

		// Modify the original objects
		initialObject.nested.value = 100;
		newObject.nested.value = 200;

		// Our state history should not be affected by these changes
		expect(result.current.state).toEqual({ nested: { value: 1 } });
		expect(result.current.history.past[0]).toEqual({
			nested: { value: 0 }
		});
	});

	it('should not add to history if new value is equal to current', () => {
		const { result } = renderHook(() => {
			return useStateHistory({ count: 0 });
		});

		act(() => {
			result.current.set({ count: 0 });
		});

		expect(result.current.canUndo).toEqual(false);
		expect(result.current.history.past).toEqual([]);
	});

	it('should do nothing on undo/redo if not possible', () => {
		const { result } = renderHook(() => {
			return useStateHistory({ count: 0 });
		});

		// Trying to undo with no history
		act(() => {
			result.current.undo();
		});

		// State should remain unchanged
		expect(result.current.state).toEqual({ count: 0 });

		// Now let's test redo after a complete undo cycle
		act(() => {
			// Add a state entry
			result.current.set({ count: 1 });
		});

		// Verify the state is updated
		expect(result.current.state).toEqual({ count: 1 });

		// Undo back to initial state
		act(() => {
			result.current.undo();
		});

		// Verify we're back to initial state
		expect(result.current.state).toEqual({ count: 0 });

		// Do a valid redo
		act(() => {
			result.current.redo();
		});

		// Back to state { count: 1 }
		expect(result.current.state).toEqual({ count: 1 });

		// Try to redo again when there's nothing to redo
		act(() => {
			result.current.redo();
		});

		// State should remain the same
		expect(result.current.state).toEqual({ count: 1 });
	});

	describe('with timing options', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should debounce updates with debounceTime option', () => {
			const { result } = renderHook(() =>
				useStateHistory({ count: 0 }, { debounceTime: 500 })
			);

			// Set the value to 1
			act(() => {
				result.current.set({ count: 1 });
			});

			// Value should not be updated yet due to debounce
			expect(result.current.state).toEqual({ count: 0 });

			// Update again before debounce completes
			act(() => {
				result.current.set({ count: 2 });
			});

			// Value should still not be updated
			expect(result.current.state).toEqual({ count: 0 });

			// Advance time past debounce delay
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// Now value should be updated to the last set value
			expect(result.current.state).toEqual({ count: 2 });

			// Only one history entry should exist despite multiple calls
			expect(result.current.history.past).toEqual([{ count: 0 }]);
		});

		it('should use setDirect to bypass timing controls', () => {
			const { result } = renderHook(() =>
				useStateHistory({ count: 0 }, { debounceTime: 500 })
			);

			// Using regular set (should be debounced)
			act(() => {
				result.current.set({ count: 1 });
			});

			// Value should not change yet
			expect(result.current.state).toEqual({ count: 0 });

			// Using setDirect should bypass debounce
			act(() => {
				result.current.setDirect({ count: 2 });
			});

			// Value should update immediately with setDirect
			expect(result.current.state).toEqual({ count: 2 });

			// The debounced update should still be pending
			// Advance time to let the debounced update happen
			act(() => {
				vi.advanceTimersByTime(500);
			});

			// State should now have the debounced value
			expect(result.current.state).toEqual({ count: 1 });
		});
	});
});
