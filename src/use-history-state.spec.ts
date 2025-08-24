import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useHistoryState from './use-history-state';

describe('/use-history-state', () => {
	it('should initialize with the initial value', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange });
		});

		expect(onChange).not.toHaveBeenCalled();
		expect(result.current.canUndo).toEqual(false);
		expect(result.current.canRedo).toEqual(false);

		expect(result.current.past).toEqual([]);
		expect(result.current.state).toEqual({ count: 0 });
		expect(result.current.future).toEqual([]);
	});

	it('should update the state and store history', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange });
		});

		act(() => {
			result.current.set({ count: 1 });
		});

		expect(onChange).toHaveBeenCalledWith({
			action: 'SET',
			state: { count: 1 }
		});
		expect(result.current.canRedo).toEqual(false);
		expect(result.current.canUndo).toEqual(true);

		expect(result.current.past).toEqual([{ count: 0 }]);
		expect(result.current.state).toEqual({ count: 1 });
		expect(result.current.future).toEqual([]);
	});

	it('should undo changes', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange });
		});

		act(() => {
			result.current.set({ count: 1 });
			result.current.set({ count: 2 });
		});

		expect(onChange).toHaveBeenCalledWith({
			action: 'SET',
			state: { count: 2 }
		});
		expect(result.current.state).toEqual({ count: 2 });

		act(() => {
			result.current.undo();
		});

		expect(onChange).toHaveBeenCalledWith({
			action: 'UNDO',
			state: { count: 1 }
		});
		expect(result.current.canUndo).toEqual(true);
		expect(result.current.canRedo).toEqual(true);

		expect(result.current.past).toEqual([{ count: 0 }]);
		expect(result.current.state).toEqual({ count: 1 });
		expect(result.current.future).toEqual([{ count: 2 }]);
	});

	it('should redo changes', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange });
		});

		act(() => {
			result.current.set({ count: 1 });
			result.current.set({ count: 2 });
		});

		expect(onChange).toHaveBeenCalledWith({
			action: 'SET',
			state: { count: 2 }
		});

		expect(result.current.state).toEqual({ count: 2 });

		act(() => {
			result.current.undo();
		});

		expect(onChange).toHaveBeenCalledWith({
			action: 'UNDO',
			state: { count: 1 }
		});
		expect(result.current.state).toEqual({ count: 1 });

		act(() => {
			result.current.redo();
		});

		expect(onChange).toHaveBeenCalledWith({
			action: 'REDO',
			state: { count: 2 }
		});
		expect(result.current.canUndo).toEqual(true);
		expect(result.current.canRedo).toEqual(false);

		expect(result.current.past).toEqual([{ count: 0 }, { count: 1 }]);
		expect(result.current.state).toEqual({ count: 2 });
		expect(result.current.future).toEqual([]);
	});

	it('should clear history', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange });
		});

		act(() => {
			result.current.set({ count: 1 });
			result.current.set({ count: 2 });
			result.current.clear();
		});

		expect(onChange).toHaveBeenCalledWith({
			action: 'CLEAR',
			state: { count: 0 }
		});
		expect(result.current.canUndo).toEqual(false);
		expect(result.current.canRedo).toEqual(false);

		expect(result.current.past).toEqual([]);
		expect(result.current.state).toEqual({ count: 0 });
		expect(result.current.future).toEqual([]);
	});

	it('should respect maxCapacity', () => {
		// Use a maxCapacity of 2
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { maxCapacity: 2 });
		});

		// Add 3 states (initial + 3 new ones)
		act(() => {
			result.current.set({ count: 1 });
		});

		// We should have 1 past state
		expect(result.current.past).toEqual([{ count: 0 }]);

		act(() => {
			result.current.set({ count: 2 });
		});

		// We should now have 2 past states
		expect(result.current.past).toEqual([{ count: 0 }, { count: 1 }]);

		act(() => {
			result.current.set({ count: 3 });
		});

		// We've exceeded capacity, should drop the oldest state
		expect(result.current.past).toEqual([{ count: 1 }, { count: 2 }]);
		expect(result.current.state).toEqual({ count: 3 });

		act(() => {
			result.current.set({ count: 4 });
		});

		// Should continue to drop the oldest state when adding a new one
		expect(result.current.past).toEqual([{ count: 2 }, { count: 3 }]);
	});

	it('should perform deep copies to avoid reference issues', () => {
		const initialObject = { nested: { value: 0 } };
		const { result } = renderHook(() => {
			return useHistoryState(initialObject);
		});

		const newObject = { nested: { value: 1 } };

		act(() => {
			result.current.set(newObject);
		});

		// Modify the original objects
		initialObject.nested.value = 100;
		newObject.nested.value = 200;

		// Our state history should not be affected by these changes
		expect(result.current.past[0]).toEqual({ nested: { value: 0 } });
		expect(result.current.state).toEqual({ nested: { value: 1 } });
	});

	it('should not add to history if new value is equal to current', () => {
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 });
		});

		act(() => {
			result.current.set({ count: 0 });
		});

		expect(result.current.canUndo).toEqual(false);
		expect(result.current.past).toEqual([]);
	});

	it('should do nothing on undo/redo if not possible', () => {
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 });
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
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { debounceTime: 500 });
			});

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

			// Only one history entry should exist despite multiple calls
			expect(result.current.past).toEqual([{ count: 0 }]);

			// Now value should be updated to the last set value
			expect(result.current.state).toEqual({ count: 2 });
		});

		it('should use setDirect to bypass timing controls', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { debounceTime: 500 });
			});

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

	describe('pause and resume functionality', () => {
		it('should start in unpaused state', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			expect(result.current.paused).toBe(false);
		});

		it('should pause history tracking', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			act(() => {
				result.current.pause();
			});

			expect(result.current.paused).toBe(true);
		});

		it('should resume history tracking', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			act(() => {
				result.current.pause();
				result.current.resume();
			});

			expect(result.current.paused).toBe(false);
		});

		it('should not add to history when paused', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			// Add initial state
			act(() => {
				result.current.set({ count: 1 });
			});

			expect(result.current.past).toEqual([{ count: 0 }]);

			// Pause and set new value
			act(() => {
				result.current.pause();
				result.current.set({ count: 2 });
			});

			expect(result.current.canUndo).toBe(true); // Should still be able to undo to previous state

			// State should update but history should not
			expect(result.current.past).toEqual([{ count: 0 }]);
			expect(result.current.state).toEqual({ count: 2 });
		});

		it('should resume adding to history after resuming', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			// Add initial state
			act(() => {
				result.current.set({ count: 1 });
			});

			// Pause, set value, then resume and set again
			act(() => {
				result.current.pause();
				result.current.set({ count: 2 });
				result.current.resume();
				result.current.set({ count: 3 });
			});

			// History should include the state before pause and after resume
			expect(result.current.past).toEqual([{ count: 0 }, { count: 2 }]);
			expect(result.current.state).toEqual({ count: 3 });
		});

		it('should maintain pause state through undo/redo operations', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			// Add some history
			act(() => {
				result.current.set({ count: 1 });
				result.current.set({ count: 2 });
			});

			// Pause and perform undo/redo
			act(() => {
				result.current.pause();
				result.current.undo();
			});

			expect(result.current.paused).toBe(true);
			expect(result.current.state).toEqual({ count: 1 });

			act(() => {
				result.current.redo();
			});

			expect(result.current.paused).toBe(true);
			expect(result.current.state).toEqual({ count: 2 });
		});

		it('should maintain pause state through clear operation', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			act(() => {
				result.current.set({ count: 1 });
				result.current.pause();
				result.current.clear();
			});

			expect(result.current.paused).toBe(true);
			expect(result.current.state).toEqual({ count: 0 });
		});
	});

	describe('immutable option', () => {
		it('should use reference equality for immutable data', () => {
			const initialData = { count: 0 };
			const { result } = renderHook(() => {
				return useHistoryState(initialData, { immutable: true });
			});

			const newData = { count: 1 };

			act(() => {
				result.current.set(newData);
			});

			expect(result.current.past[0]).toBe(initialData); // Same reference
			expect(result.current.state).toBe(newData); // Same reference
		});

		it('should not update when setting same reference for immutable data', () => {
			const data = { count: 0 };
			const onChange = vi.fn();
			const { result } = renderHook(() => {
				return useHistoryState(data, { immutable: true, onChange });
			});

			act(() => {
				result.current.set(data); // Same reference
			});

			expect(onChange).not.toHaveBeenCalled();
			expect(result.current.canUndo).toBe(false);
			expect(result.current.past).toEqual([]);
		});

		it('should update when setting different reference for immutable data', () => {
			const data1 = { count: 0 };
			const data2 = { count: 0 }; // Same value, different reference
			const onChange = vi.fn();
			const { result } = renderHook(() => {
				return useHistoryState(data1, { immutable: true, onChange });
			});

			act(() => {
				result.current.set(data2);
			});

			expect(onChange).toHaveBeenCalledWith({
				action: 'SET',
				state: data2
			});
			expect(result.current.past[0]).toBe(data1);
			expect(result.current.state).toBe(data2);
		});

		it('should work with primitive immutable values', () => {
			const { result } = renderHook(() => {
				return useHistoryState(0, { immutable: true });
			});

			act(() => {
				result.current.set(1);
			});

			expect(result.current.past[0]).toBe(0);
			expect(result.current.state).toBe(1);

			// Setting same value should not update
			act(() => {
				result.current.set(1);
			});

			expect(result.current.past).toEqual([0]); // No new history entry
		});

		it('should perform deep copy when immutable is false (default)', () => {
			const initialData = { nested: { value: 0 } };
			const { result } = renderHook(() => {
				return useHistoryState(initialData);
			});

			const newData = { nested: { value: 1 } };

			act(() => {
				result.current.set(newData);
			});

			// Should be deep copies, not same references
			expect(result.current.past[0]).not.toBe(initialData);
			expect(result.current.past[0]).toEqual(initialData);

			expect(result.current.state).not.toBe(newData);
			expect(result.current.state).toEqual(newData);
		});

		it('should use JSON.stringify for equality when immutable is false', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			// Different objects with same content
			act(() => {
				result.current.set({ count: 0 });
			});

			expect(result.current.canUndo).toBe(false);
			expect(result.current.past).toEqual([]);
		});
	});
});
