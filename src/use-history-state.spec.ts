import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useHistoryState from './use-history-state';

describe('/use-history-state', () => {
	it('should initialize with the initial value', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange });
		});

		const [state] = result.current;

		expect(onChange).not.toHaveBeenCalled();
		expect(state.canUndo).toEqual(false);
		expect(state.canRedo).toEqual(false);

		expect(state.past).toEqual([]);
		expect(state.present).toEqual({ count: 0 });
		expect(state.future).toEqual([]);
	});

	it('should update the state and store history', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange, debounceMs: 0 });
		});

		const [, actions] = result.current;

		act(() => {
			actions.set({ count: 1 });
		});

		const [state] = result.current;

		expect(onChange).toHaveBeenCalledWith({
			action: 'SET',
			state: { count: 1 }
		});
		expect(state.canRedo).toEqual(false);
		expect(state.canUndo).toEqual(true);

		expect(state.past).toEqual([{ count: 0 }]);
		expect(state.present).toEqual({ count: 1 });
		expect(state.future).toEqual([]);
	});

	it('should undo changes', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange, debounceMs: 0 });
		});

		const [, actions] = result.current;

		act(() => {
			actions.set({ count: 1 });
			actions.set({ count: 2 });
		});

		let [state] = result.current;

		expect(onChange).toHaveBeenCalledWith({
			action: 'SET',
			state: { count: 2 }
		});
		expect(state.present).toEqual({ count: 2 });

		act(() => {
			actions.undo();
		});

		[state] = result.current;

		expect(onChange).toHaveBeenCalledWith({
			action: 'UNDO',
			state: { count: 1 }
		});
		expect(state.canUndo).toEqual(true);
		expect(state.canRedo).toEqual(true);

		expect(state.past).toEqual([{ count: 0 }]);
		expect(state.present).toEqual({ count: 1 });
		expect(state.future).toEqual([{ count: 2 }]);
	});

	it('should redo changes', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange, debounceMs: 0 });
		});

		const [, actions] = result.current;

		act(() => {
			actions.set({ count: 1 });
			actions.set({ count: 2 });
		});

		let [state] = result.current;

		expect(onChange).toHaveBeenCalledWith({
			action: 'SET',
			state: { count: 2 }
		});

		expect(state.present).toEqual({ count: 2 });

		act(() => {
			actions.undo();
		});

		[state] = result.current;

		expect(onChange).toHaveBeenCalledWith({
			action: 'UNDO',
			state: { count: 1 }
		});
		expect(state.present).toEqual({ count: 1 });

		act(() => {
			actions.redo();
		});

		[state] = result.current;

		expect(onChange).toHaveBeenCalledWith({
			action: 'REDO',
			state: { count: 2 }
		});
		expect(state.canUndo).toEqual(true);
		expect(state.canRedo).toEqual(false);

		expect(state.past).toEqual([{ count: 0 }, { count: 1 }]);
		expect(state.present).toEqual({ count: 2 });
		expect(state.future).toEqual([]);
	});

	it('should reset to initial state', () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { onChange, debounceMs: 0 });
		});

		const [, actions] = result.current;

		act(() => {
			actions.set({ count: 1 });
			actions.set({ count: 2 });
			actions.initial();
		});

		const [state] = result.current;

		expect(onChange).toHaveBeenCalledWith({
			action: 'INITIAL',
			state: { count: 0 }
		});
		expect(state.canUndo).toEqual(false);
		expect(state.canRedo).toEqual(false);

		expect(state.past).toEqual([]);
		expect(state.present).toEqual({ count: 0 });
		expect(state.future).toEqual([]);
	});

	it('should replace the state', () => {
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { debounceMs: 0 });
		});

		const [, actions] = result.current;

		act(() => {
			actions.replace({ count: 1 });
		});

		let [state] = result.current;

		expect(state.present).toEqual({ count: 1 });
		expect(state.past).toEqual([]);
		expect(state.future).toEqual([]);

		act(() => {
			actions.set({ count: 2 });
		});

		[state] = result.current;

		expect(state.present).toEqual({ count: 2 });
		expect(state.past).toEqual([{ count: 1 }]);
		expect(state.future).toEqual([]);

		act(() => {
			actions.replace({ count: 3 });
		});

		[state] = result.current;

		expect(state.present).toEqual({ count: 3 });
		expect(state.past).toEqual([]);
		expect(state.future).toEqual([]);
	});

	it('should respect maxCapacity', () => {
		// Use a maxCapacity of 2
		const { result } = renderHook(() => {
			return useHistoryState(
				{ count: 0 },
				{ maxCapacity: 2, debounceMs: 0 }
			);
		});

		const [, actions] = result.current;

		// Add 3 states (initial + 3 new ones)
		act(() => {
			actions.set({ count: 1 });
		});

		let [state] = result.current;

		// We should have 1 past state
		expect(state.past).toEqual([{ count: 0 }]);

		act(() => {
			actions.set({ count: 2 });
		});

		[state] = result.current;

		// We should now have 2 past states
		expect(state.past).toEqual([{ count: 0 }, { count: 1 }]);

		act(() => {
			actions.set({ count: 3 });
		});

		[state] = result.current;

		// We've exceeded capacity, should drop the oldest state
		expect(state.past).toEqual([{ count: 1 }, { count: 2 }]);
		expect(state.present).toEqual({ count: 3 });

		act(() => {
			actions.set({ count: 4 });
		});

		[state] = result.current;

		// Should continue to drop the oldest state when adding a new one
		expect(state.past).toEqual([{ count: 2 }, { count: 3 }]);
	});

	it('should perform deep copies to avoid reference issues', () => {
		const initialObject = { nested: { value: 0 } };
		const { result } = renderHook(() => {
			return useHistoryState(initialObject, {
				immutable: false,
				debounceMs: 0
			});
		});

		const [, actions] = result.current;
		const newObject = { nested: { value: 1 } };

		act(() => {
			actions.set(newObject);
		});

		// Modify the original objects
		initialObject.nested.value = 100;
		newObject.nested.value = 200;

		const [state] = result.current;

		// Our state history should not be affected by these changes
		expect(state.past[0]).toEqual({ nested: { value: 0 } });
		expect(state.present).toEqual({ nested: { value: 1 } });
	});

	it('should not add to history if new value is equal to current', () => {
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { immutable: false });
		});

		const [, actions] = result.current;

		act(() => {
			actions.set({ count: 0 });
		});

		const [state] = result.current;

		expect(state.canUndo).toEqual(false);
		expect(state.past).toEqual([]);
	});

	it('should do nothing on undo/redo if not possible', () => {
		const { result } = renderHook(() => {
			return useHistoryState({ count: 0 }, { debounceMs: 0 });
		});

		const [, actions] = result.current;

		// Trying to undo with no history
		act(() => {
			actions.undo();
		});

		let [state] = result.current;

		// State should remain unchanged
		expect(state.present).toEqual({ count: 0 });

		// Now let's test redo after a complete undo cycle
		act(() => {
			// Add a state entry
			actions.set({ count: 1 });
		});

		[state] = result.current;

		// Verify the state is updated
		expect(state.present).toEqual({ count: 1 });

		// Undo back to initial state
		act(() => {
			actions.undo();
		});

		[state] = result.current;

		// Verify we're back to initial state
		expect(state.present).toEqual({ count: 0 });

		// Do a valid redo
		act(() => {
			actions.redo();
		});

		[state] = result.current;

		// Back to state { count: 1 }
		expect(state.present).toEqual({ count: 1 });

		// Try to redo again when there's nothing to redo
		act(() => {
			actions.redo();
		});

		[state] = result.current;

		// State should remain the same
		expect(state.present).toEqual({ count: 1 });
	});

	describe('with timing options', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should debounce updates with debounceMs option', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { debounceMs: 500 });
			});

			const [, actions] = result.current;

			// Set the value to 1
			act(() => {
				actions.set({ count: 1 });
			});

			let [state] = result.current;

			// Value should not be updated yet due to debounce
			expect(state.present).toEqual({ count: 0 });

			// Update again before debounce completes
			act(() => {
				actions.set({ count: 2 });
			});

			[state] = result.current;

			// Value should still not be updated
			expect(state.present).toEqual({ count: 0 });

			// Advance time past debounce delay
			act(() => {
				vi.advanceTimersByTime(500);
			});

			[state] = result.current;

			// Only one history entry should exist despite multiple calls
			expect(state.past).toEqual([{ count: 0 }]);

			// Now value should be updated to the last set value
			expect(state.present).toEqual({ count: 2 });
		});

		it('should use setDirect to bypass timing controls', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { debounceMs: 500 });
			});

			const [, actions] = result.current;

			// Using regular set (should be debounced)
			act(() => {
				actions.set({ count: 1 });
			});

			let [state] = result.current;

			// Value should not change yet
			expect(state.present).toEqual({ count: 0 });

			// Using setDirect should bypass debounce
			act(() => {
				actions.setDirect({ count: 2 });
			});

			[state] = result.current;

			// Value should update immediately with setDirect
			expect(state.present).toEqual({ count: 2 });

			// The debounced update should still be pending
			// Advance time to let the debounced update happen
			act(() => {
				vi.advanceTimersByTime(500);
			});

			[state] = result.current;

			// State should now have the debounced value
			expect(state.present).toEqual({ count: 1 });
		});
	});

	describe('pause and resume functionality', () => {
		it('should start in unpaused state', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			const [state] = result.current;

			expect(state.paused).toBe(false);
		});

		it('should pause history tracking', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			const [, actions] = result.current;

			act(() => {
				actions.pause();
			});

			const [state] = result.current;

			expect(state.paused).toBe(true);
		});

		it('should resume history tracking', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 });
			});

			const [, actions] = result.current;

			act(() => {
				actions.pause();
				actions.resume();
			});

			const [state] = result.current;

			expect(state.paused).toBe(false);
		});

		it('should not add to history when paused', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { debounceMs: 0 });
			});

			const [, actions] = result.current;

			// Add initial state
			act(() => {
				actions.set({ count: 1 });
			});

			let [state] = result.current;

			expect(state.past).toEqual([{ count: 0 }]);

			// Pause and set new value
			act(() => {
				actions.pause();
				actions.set({ count: 2 });
			});

			[state] = result.current;

			expect(state.canUndo).toBe(true); // Should still be able to undo to previous state

			// State should update but history should not
			expect(state.past).toEqual([{ count: 0 }]);
			expect(state.present).toEqual({ count: 2 });
		});

		it('should resume adding to history after resuming', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { debounceMs: 0 });
			});

			const [, actions] = result.current;

			// Add initial state
			act(() => {
				actions.set({ count: 1 });
			});

			// Pause, set value, then resume and set again
			act(() => {
				actions.pause();
				actions.set({ count: 2 });
				actions.resume();
				actions.set({ count: 3 });
			});

			const [state] = result.current;

			// History should include the state before pause and after resume
			expect(state.past).toEqual([{ count: 0 }, { count: 2 }]);
			expect(state.present).toEqual({ count: 3 });
		});

		it('should maintain pause state through undo/redo operations', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { debounceMs: 0 });
			});

			const [, actions] = result.current;

			// Add some history
			act(() => {
				actions.set({ count: 1 });
				actions.set({ count: 2 });
			});

			// Pause and perform undo/redo
			act(() => {
				actions.pause();
				actions.undo();
			});

			let [state] = result.current;

			expect(state.paused).toBe(true);
			expect(state.present).toEqual({ count: 1 });

			act(() => {
				actions.redo();
			});

			[state] = result.current;

			expect(state.paused).toBe(true);
			expect(state.present).toEqual({ count: 2 });
		});

		it('should maintain pause state through initial operation', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { debounceMs: 0 });
			});

			const [, actions] = result.current;

			act(() => {
				actions.set({ count: 1 });
				actions.pause();
				actions.initial();
			});

			const [state] = result.current;

			expect(state.paused).toBe(true);
			expect(state.present).toEqual({ count: 0 });
		});
	});

	describe('immutable option', () => {
		it('should use reference equality for immutable data', () => {
			const initialData = { count: 0 };
			const { result } = renderHook(() => {
				return useHistoryState(initialData, {
					immutable: true,
					debounceMs: 0
				});
			});

			const [, actions] = result.current;
			const newData = { count: 1 };

			act(() => {
				actions.set(newData);
			});

			const [state] = result.current;

			expect(state.past[0]).toBe(initialData); // Same reference
			expect(state.present).toBe(newData); // Same reference
		});

		it('should not update when setting same reference for immutable data', () => {
			const data = { count: 0 };
			const onChange = vi.fn();
			const { result } = renderHook(() => {
				return useHistoryState(data, { immutable: true, onChange });
			});

			const [, actions] = result.current;

			act(() => {
				actions.set(data); // Same reference
			});

			const [state] = result.current;

			expect(onChange).not.toHaveBeenCalled();
			expect(state.canUndo).toBe(false);
			expect(state.past).toEqual([]);
		});

		it('should update when setting different reference for immutable data', () => {
			const data1 = { count: 0 };
			const data2 = { count: 0 }; // Same value, different reference
			const onChange = vi.fn();
			const { result } = renderHook(() => {
				return useHistoryState(data1, {
					immutable: true,
					onChange,
					debounceMs: 0
				});
			});

			const [, actions] = result.current;

			act(() => {
				actions.set(data2);
			});

			const [state] = result.current;

			expect(onChange).toHaveBeenCalledWith({
				action: 'SET',
				state: data2
			});
			expect(state.past[0]).toBe(data1);
			expect(state.present).toBe(data2);
		});

		it('should work with primitive immutable values', () => {
			const { result } = renderHook(() => {
				return useHistoryState(0, { immutable: true, debounceMs: 0 });
			});

			const [, actions] = result.current;

			act(() => {
				actions.set(1);
			});

			let [state] = result.current;

			expect(state.past[0]).toBe(0);
			expect(state.present).toBe(1);

			// Setting same value should not update
			act(() => {
				actions.set(1);
			});

			[state] = result.current;

			expect(state.past).toEqual([0]); // No new history entry
		});

		it('should perform deep copy when immutable is false (default)', () => {
			const initialData = { nested: { value: 0 } };
			const { result } = renderHook(() => {
				return useHistoryState(initialData, {
					immutable: false,
					debounceMs: 0
				});
			});

			const [, actions] = result.current;
			const newData = { nested: { value: 1 } };

			act(() => {
				actions.set(newData);
			});

			const [state] = result.current;

			// Should be deep copies, not same references
			expect(state.past[0]).not.toBe(initialData);
			expect(state.past[0]).toEqual(initialData);

			expect(state.present).not.toBe(newData);
			expect(state.present).toEqual(newData);
		});

		it('should use JSON.stringify for equality when immutable is false', () => {
			const { result } = renderHook(() => {
				return useHistoryState({ count: 0 }, { immutable: false });
			});

			const [, actions] = result.current;

			// Different objects with same content
			act(() => {
				actions.set({ count: 0 });
			});

			const [state] = result.current;

			expect(state.canUndo).toBe(false);
			expect(state.past).toEqual([]);
		});
	});
});
