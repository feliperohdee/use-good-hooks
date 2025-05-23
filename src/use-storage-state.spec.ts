import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import JSON from 'use-json';

import is from '@/is';
import useStorageState, { jsonReplacer } from '@/use-storage-state';

class FakeStorage {
	constructor(private storage: Record<string, string> = {}) {}

	getItem(key: string) {
		return this.storage[key];
	}

	setItem(key: string, value: string) {
		this.storage[key] = value;
	}

	removeItem(key: string) {
		delete this.storage[key];
	}
}

describe('/use-storage-state', () => {
	let fakeStorage: FakeStorage;

	beforeEach(() => {
		fakeStorage = new FakeStorage();
		vi.useFakeTimers();

		Object.defineProperty(window, 'localStorage', {
			value: fakeStorage,
			writable: true
		});

		Object.defineProperty(window, 'sessionStorage', {
			value: fakeStorage,
			writable: true
		});

		vi.spyOn(fakeStorage, 'getItem');
		vi.spyOn(fakeStorage, 'setItem');
		vi.spyOn(fakeStorage, 'removeItem');
		vi.spyOn(is, 'browser').mockReturnValue(true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('initialization', () => {
		it('should initialize with the default value when storage is empty', () => {
			const { result } = renderHook(() => {
				return useStorageState('testKey', { value: 'defaultValue' });
			});

			expect(result.current[0]).toEqual({ value: 'defaultValue' });
		});

		it('should load initial value from storage', () => {
			fakeStorage.setItem(
				'testKey',
				JSON.stringify({ value: 'storedValue' })
			);

			const { result } = renderHook(() => {
				return useStorageState('testKey', { value: 'defaultValue' });
			});

			expect(result.current[0]).toEqual({ value: 'storedValue' });
		});

		it('should handle complex objects', () => {
			const complexObject = { foo: 'bar', nested: { value: 42 } };
			fakeStorage.setItem('testKey', JSON.stringify(complexObject));

			const { result } = renderHook(() => {
				return useStorageState('testKey', {});
			});

			expect(result.current[0]).toEqual(complexObject);
		});
	});

	describe('storage updates', () => {
		it('should update storage when state changes after debounce', async () => {
			const { result } = renderHook(() => {
				return useStorageState(
					'testKey',
					{ value: 'initial' },
					{ debounce: 100 }
				);
			});

			act(() => {
				result.current[1]({ value: 'newValue' });
			});

			// Storage should not be updated immediately
			expect(fakeStorage.setItem).toHaveBeenCalledOnce();
			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ value: 'initial' })
			);

			// Fast-forward debounce time
			act(() => {
				vi.advanceTimersByTime(100);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledTimes(2);
			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ value: 'newValue' })
			);
		});

		it('should handle state updates with function updater', () => {
			const { result } = renderHook(() => {
				return useStorageState('testKey', { value: 'initial' });
			});

			act(() => {
				result.current[1](prev => ({
					value: prev.value + '_updated'
				}));
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ value: 'initial_updated' })
			);
		});

		it('should use custom debounce time', () => {
			const { result } = renderHook(() => {
				return useStorageState(
					'testKey',
					{ value: 'initial' },
					{ debounce: 1000 }
				);
			});

			act(() => {
				result.current[1]({ value: 'newValue' });
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledOnce();
			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ value: 'initial' })
			);

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledTimes(2);
			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ value: 'newValue' })
			);
		});
	});

	describe('storage type', () => {
		it('should use sessionStorage when specified', () => {
			renderHook(() => {
				return useStorageState(
					'testKey',
					{ value: 'initial' },
					{ storage: 'session' }
				);
			});

			expect(fakeStorage.getItem).toHaveBeenCalledWith('testKey');
		});
	});

	describe('error handling', () => {
		it('should handle storage errors', () => {
			const onError = vi.fn();
			const error = new Error('Storage error');

			vi.mocked(fakeStorage.getItem).mockImplementation(() => {
				throw error;
			});

			renderHook(() => {
				return useStorageState(
					'testKey',
					{ value: 'initial' },
					{ onError }
				);
			});

			expect(onError).toHaveBeenCalledWith(error);
		});
	});

	describe('browser environment', () => {
		it('should not attempt to use storage when is.browser() is false', () => {
			vi.mocked(is.browser).mockReturnValue(false);

			const { result } = renderHook(() => {
				return useStorageState('testKey', { value: 'initial' });
			});

			act(() => {
				result.current[1]({ value: 'newValue' });
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).not.toHaveBeenCalled();
		});
	});

	describe('key management', () => {
		it('should handle removeKey functionality', () => {
			const { result } = renderHook(() => {
				return useStorageState('testKey', { value: 'initial' });
			});

			act(() => {
				result.current[2].removeKey();
			});

			expect(fakeStorage.removeItem).toHaveBeenCalledWith('testKey');
			expect(result.current[0]).toEqual({ value: 'initial' });
		});

		it('should handle omitKeys with array', () => {
			const initialState = { keep: 'value', remove: 'sensitive' };
			fakeStorage.setItem('testKey', JSON.stringify(initialState));

			const { result } = renderHook(() => {
				return useStorageState('testKey', initialState, {
					omitKeys: ['remove']
				});
			});

			act(() => {
				result.current[1]({ keep: 'newValue', remove: 'newSensitive' });
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ keep: 'newValue' })
			);
		});

		it('should handle omitKeys with function', () => {
			const initialState = { public: 'value', sensitive: 'data' };
			fakeStorage.setItem('testKey', JSON.stringify(initialState));

			const { result } = renderHook(() => {
				return useStorageState('testKey', initialState, {
					omitKeys: (_value, key) => key.includes('sensitive')
				});
			});

			act(() => {
				result.current[1]({ public: 'newValue', sensitive: 'newData' });
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ public: 'newValue' })
			);
		});

		it('should handle pickKeys with array', () => {
			const initialState = { keep: 'value', ignore: 'other' };
			fakeStorage.setItem('testKey', JSON.stringify(initialState));

			const { result } = renderHook(() => {
				return useStorageState('testKey', initialState, {
					pickKeys: ['keep']
				});
			});

			act(() => {
				result.current[1]({ keep: 'newValue', ignore: 'newOther' });
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ keep: 'newValue' })
			);
		});

		it('should handle pickKeys with function', () => {
			const initialState = { saveMe: 'value', temp: 'data' };
			fakeStorage.setItem('testKey', JSON.stringify(initialState));

			const { result } = renderHook(() => {
				return useStorageState('testKey', initialState, {
					pickKeys: (_value, key) => key.startsWith('save')
				});
			});

			act(() => {
				result.current[1]({ saveMe: 'newValue', temp: 'newData' });
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ saveMe: 'newValue' })
			);
		});

		it('should handle both pickKeys and omitKeys together', () => {
			const initialState = {
				keep: 'value',
				remove: 'data',
				other: 'info'
			};
			fakeStorage.setItem('testKey', JSON.stringify(initialState));

			const { result } = renderHook(() => {
				return useStorageState('testKey', initialState, {
					pickKeys: ['keep', 'remove'],
					omitKeys: ['remove']
				});
			});

			act(() => {
				result.current[1]({
					keep: 'newValue',
					remove: 'newData',
					other: 'newInfo'
				});
			});

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(fakeStorage.setItem).toHaveBeenCalledWith(
				'testKey',
				JSON.stringify({ keep: 'newValue' })
			);
		});
	});

	describe('complex data types', () => {
		it('should handle Map objects', () => {
			const map = new Map([
				['key1', 'value1'],
				['key2', 'value2']
			]);
			fakeStorage.setItem(
				'testKey',
				JSON.stringify({ map }, jsonReplacer)
			);

			const { result } = renderHook(() => {
				return useStorageState('testKey', { map: new Map() });
			});

			expect(result.current[0]).toEqual({ map });
		});

		it('should handle Set objects', () => {
			const set = new Set(['value1', 'value2', 'value3']);
			fakeStorage.setItem(
				'testKey',
				JSON.stringify({ set }, jsonReplacer)
			);

			const { result } = renderHook(() => {
				return useStorageState('testKey', { set: new Set() });
			});

			expect(result.current[0]).toEqual({ set });
		});
	});
});
