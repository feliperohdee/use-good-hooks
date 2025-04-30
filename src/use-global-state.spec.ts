import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { createGlobalState, useGlobalState } from '@/use-global-state';

describe('/use-global-state', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('createGlobalState', () => {
		it('should create a global state with initial value', () => {
			const initialState = { count: 0 };
			const [state, setState, store] = createGlobalState(initialState);

			expect(state).toEqual(initialState);
			expect(typeof setState).toEqual('function');
			expect(store).toHaveProperty('getState');
			expect(store).toHaveProperty('subscribe');
			expect(store).toHaveProperty('resetState');
		});

		it('should update global state and notify subscribers', () => {
			const initialState = { count: 0 };
			const [, setState, store] = createGlobalState(initialState);
			const mockSubscriber = vi.fn();

			const unsubscribe = store.subscribe(mockSubscriber);

			// Update with new value
			act(() => {
				setState({ count: 1 });
			});

			expect(store.getState()).toEqual({ count: 1 });
			expect(mockSubscriber).toHaveBeenCalledWith({ count: 1 });
			expect(mockSubscriber).toHaveBeenCalledTimes(1);

			// Update with function
			act(() => {
				setState(prevState => {
					return {
						count: prevState.count + 1
					};
				});
			});

			expect(store.getState()).toEqual({ count: 2 });
			expect(mockSubscriber).toHaveBeenCalledWith({ count: 2 });
			expect(mockSubscriber).toHaveBeenCalledTimes(2);

			// Check unsubscribe
			unsubscribe();
			act(() => {
				setState({ count: 3 });
			});

			expect(store.getState()).toEqual({ count: 3 });
			expect(mockSubscriber).toHaveBeenCalledTimes(2); // No additional calls
		});

		it('should notify multiple subscribers', () => {
			const initialState = { count: 0 };
			const [, setState, store] = createGlobalState(initialState);

			const mockSubscriber1 = vi.fn();
			const mockSubscriber2 = vi.fn();
			const mockSubscriber3 = vi.fn();

			const unsubscribe1 = store.subscribe(mockSubscriber1);
			const unsubscribe2 = store.subscribe(mockSubscriber2);
			const unsubscribe3 = store.subscribe(mockSubscriber3);

			act(() => {
				setState({ count: 5 });
			});

			// All subscribers should be notified
			expect(mockSubscriber1).toHaveBeenCalledWith({ count: 5 });
			expect(mockSubscriber2).toHaveBeenCalledWith({ count: 5 });
			expect(mockSubscriber3).toHaveBeenCalledWith({ count: 5 });

			// Unsubscribe the second subscriber
			unsubscribe2();

			act(() => {
				setState({ count: 10 });
			});

			// First and third subscribers should be notified again
			expect(mockSubscriber1).toHaveBeenCalledWith({ count: 10 });
			expect(mockSubscriber1).toHaveBeenCalledTimes(2);

			expect(mockSubscriber2).toHaveBeenCalledTimes(1); // No additional calls

			expect(mockSubscriber3).toHaveBeenCalledWith({ count: 10 });
			expect(mockSubscriber3).toHaveBeenCalledTimes(2);

			// Unsubscribe all
			unsubscribe1();
			unsubscribe3();

			act(() => {
				setState({ count: 15 });
			});

			// No additional notifications
			expect(mockSubscriber1).toHaveBeenCalledTimes(2);
			expect(mockSubscriber2).toHaveBeenCalledTimes(1);
			expect(mockSubscriber3).toHaveBeenCalledTimes(2);
		});

		it('should call subscribers in order of subscription', () => {
			const initialState = { count: 0 };
			const [, setState, store] = createGlobalState(initialState);

			// Track the order of calls
			const callOrder: number[] = [];

			const mockSubscriber1 = vi.fn().mockImplementation(() => {
				callOrder.push(1);
			});

			const mockSubscriber2 = vi.fn().mockImplementation(() => {
				callOrder.push(2);
			});

			// Subscribe in order
			store.subscribe(mockSubscriber1);
			store.subscribe(mockSubscriber2);

			act(() => {
				setState({ count: 5 });
			});

			// Subscribers should be called in order
			expect(callOrder).toEqual([1, 2]);
		});

		it('should handle errors in subscribers and continue notifying other subscribers', () => {
			const initialState = { count: 0 };
			const [, setState, store] = createGlobalState(initialState);

			// Create console.error spy to silence errors in test output
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			// First subscriber will throw an error
			const errorSubscriber = vi.fn().mockImplementation(() => {
				throw new Error('Subscriber error');
			});

			// Second subscriber should still be called
			const normalSubscriber = vi.fn();

			// Subscribe both
			store.subscribe(errorSubscriber);
			store.subscribe(normalSubscriber);

			act(() => {
				setState({ count: 5 });
			});

			// Both subscribers should have been called
			expect(errorSubscriber).toHaveBeenCalledWith({ count: 5 });
			expect(normalSubscriber).toHaveBeenCalledWith({ count: 5 });

			// Console.error should have been called with the error
			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(consoleErrorSpy.mock.calls[0][0]).toBe(
				'Error in global state subscriber:'
			);

			// Cleanup
			consoleErrorSpy.mockRestore();
		});

		it('should not update state or notify if new state is identical', () => {
			const initialState = { count: 0 };
			const [, setState, store] = createGlobalState(initialState);
			const mockSubscriber = vi.fn();

			store.subscribe(mockSubscriber);

			act(() => {
				setState({ count: 0 }); // Same value
			});

			expect(store.getState()).toEqual({ count: 0 });
			expect(mockSubscriber).not.toHaveBeenCalled();
		});

		it('should reset state to initial value', () => {
			const initialState = { count: 0 };
			const [, setState, store] = createGlobalState(initialState);
			const mockSubscriber = vi.fn();

			store.subscribe(mockSubscriber);

			act(() => {
				setState({ count: 5 });
			});

			expect(store.getState()).toEqual({ count: 5 });
			expect(mockSubscriber).toHaveBeenCalledTimes(1);

			act(() => {
				store.resetState();
			});

			expect(store.getState()).toEqual(initialState);
			expect(mockSubscriber).toHaveBeenCalledTimes(2);
			expect(mockSubscriber).toHaveBeenLastCalledWith(initialState);
		});
	});

	describe('useGlobalState', () => {
		it('should initialize with the global state value', () => {
			const initialState = { count: 0 };
			const globalState = createGlobalState(initialState);

			const { result } = renderHook(() => {
				return useGlobalState(globalState);
			});

			expect(result.current[0]).toEqual(initialState);
			expect(typeof result.current[1]).toEqual('function');
		});

		it('should update component state when global state changes', () => {
			const initialState = { count: 0 };
			const globalState = createGlobalState(initialState);

			const { result } = renderHook(() => {
				return useGlobalState(globalState);
			});
			const [, setGlobalState] = globalState;

			expect(result.current[0]).toEqual({ count: 0 });

			act(() => {
				setGlobalState({ count: 5 });
			});

			expect(result.current[0]).toEqual({ count: 5 });
		});

		it('should update global state when component calls setState', () => {
			const initialState = { count: 0 };
			const globalState = createGlobalState(initialState);
			const [, , store] = globalState;

			const { result } = renderHook(() => {
				return useGlobalState(globalState);
			});

			act(() => {
				result.current[1]({ count: 10 });
			});

			expect(result.current[0]).toEqual({ count: 10 });
			expect(store.getState()).toEqual({ count: 10 });
		});

		it('should update state when other components update global state', () => {
			const initialState = { count: 0 };
			const globalState = createGlobalState(initialState);

			// First component
			const { result: result1 } = renderHook(() => {
				return useGlobalState(globalState);
			});

			// Second component
			const { result: result2 } = renderHook(() => {
				return useGlobalState(globalState);
			});

			// Update from first component
			act(() => {
				result1.current[1]({ count: 5 });
			});

			// Both should have updated state
			expect(result1.current[0]).toEqual({ count: 5 });
			expect(result2.current[0]).toEqual({ count: 5 });

			// Update from second component
			act(() => {
				result2.current[1]({ count: 10 });
			});

			// Both should have updated state again
			expect(result1.current[0]).toEqual({ count: 10 });
			expect(result2.current[0]).toEqual({ count: 10 });
		});

		it('should cleanup subscription on unmount', () => {
			const initialState = { count: 0 };
			const globalState = createGlobalState(initialState);
			const [, , store] = globalState;

			// Mock the subscribe method
			const unsubscribeMock = vi.fn();
			vi.spyOn(store, 'subscribe').mockReturnValue(unsubscribeMock);

			// Render and then unmount the hook
			const { unmount } = renderHook(() => {
				return useGlobalState(globalState);
			});

			// Verify that subscribe was called
			expect(store.subscribe).toHaveBeenCalled();

			// Unmount to trigger cleanup
			unmount();

			// Verify unsubscribe was called
			expect(unsubscribeMock).toHaveBeenCalled();
		});

		it('should use function updater correctly', () => {
			const initialState = { count: 0 };
			const globalState = createGlobalState(initialState);

			const { result } = renderHook(() => {
				return useGlobalState(globalState);
			});

			act(() => {
				result.current[1](prevState => {
					return {
						count: prevState.count + 1
					};
				});
			});

			expect(result.current[0]).toEqual({ count: 1 });

			act(() => {
				result.current[1](prevState => {
					return {
						count: prevState.count + 1
					};
				});
			});

			expect(result.current[0]).toEqual({ count: 2 });
		});
	});
});
