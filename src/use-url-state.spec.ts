import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import isNumber from 'lodash/isNumber';

import is from '@/is';
import useUrlState from '@/use-url-state';

describe('/use-url-state', () => {
	const mockUrl = new URL('http://localhost');
	const mockReplaceState = vi.fn();
	const originalHistory = window.history;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(is, 'browser').mockReturnValue(true);

		window.history.replaceState = mockReplaceState;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
		window.history = originalHistory;
	});

	describe('initialization', () => {
		it('should initialize with default state when URL is empty', () => {
			const initialState = { count: 0, name: 'test' };
			const { result } = renderHook(() => {
				return useUrlState(initialState, { url: mockUrl });
			});

			expect(result.current[0]).toEqual(initialState);
		});

		it('should parse URL state and merge with initial state', () => {
			const url = new URL('http://localhost?count=5');
			const initialState = { count: 0, name: 'test' };
			const { result } = renderHook(() => {
				return useUrlState(initialState, { url });
			});

			expect(result.current[0]).toEqual({ ...initialState, count: 5 });
		});

		it('should parse complex nested objects', () => {
			const url = new URL(
				'http://localhost?filters[0].type=user&filters[0].value=john'
			);
			const initialState = { filters: [{ type: '', value: '' }] };
			const { result } = renderHook(() => {
				return useUrlState(initialState, { url });
			});

			expect(result.current[0]).toEqual({
				filters: [{ type: 'user', value: 'john' }]
			});
		});

		it('should parse with kebab-case', () => {
			const url = new URL(
				'http://localhost?user-name=john&first-login=true'
			);
			const initialState = { userName: '', firstLogin: false };
			const { result } = renderHook(() => {
				return useUrlState(initialState, { kebabCase: true, url });
			});

			expect(result.current[0]).toEqual({
				userName: 'john',
				firstLogin: true
			});
		});

		it('should parse with prefix option', () => {
			const url = new URL(
				'http://localhost?filter_name=john&filter_age=25'
			);
			const initialState = { name: '', age: 0 };
			const { result } = renderHook(() => {
				return useUrlState(initialState, { prefix: 'filter_', url });
			});

			expect(result.current[0]).toEqual({ name: 'john', age: 25 });
		});

		it('should parse combined prefix and kebab-case', () => {
			const url = new URL(
				'http://localhost?filter_user-name=john&filter_last-login-date=2024-01-01'
			);
			const initialState = { userName: '', lastLoginDate: '' };
			const { result } = renderHook(() => {
				return useUrlState(initialState, {
					kebabCase: true,
					prefix: 'filter_',
					url
				});
			});

			expect(result.current[0]).toEqual({
				userName: 'john',
				lastLoginDate: '2024-01-01'
			});
		});
	});

	describe('state updates', () => {
		it('should update URL when state changes after debounce', async () => {
			const initialState = { count: 0 };
			const { result } = renderHook(() => {
				return useUrlState(initialState, {
					debounce: 500,
					url: mockUrl
				});
			});

			act(() => {
				result.current[1]({ count: 1 });
				result.current[1]({ count: 2 });
				result.current[1]({ count: 3 });
			});

			expect(mockReplaceState).toHaveBeenCalledTimes(1);

			act(() => {
				vi.advanceTimersByTime(500);
			});

			expect(mockReplaceState).toHaveBeenCalledTimes(2);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('count=3')
			);
		});

		it('should handle URL updates with function updater', () => {
			const initialState = { count: 0 };
			const { result } = renderHook(() => {
				return useUrlState(initialState, { url: mockUrl });
			});

			act(() => {
				result.current[1](prev => {
					return { count: prev.count + 1 };
				});
			});

			act(() => {
				vi.runAllTimers();
			});

			expect(result.current[0].count).toEqual(1);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('count=1')
			);
		});

		it('should update combined prefix and kebab-case', () => {
			const initialState = { userName: '', lastLoginDate: '' };
			const { result } = renderHook(() => {
				return useUrlState(initialState, {
					kebabCase: true,
					prefix: 'filter_',
					url: mockUrl
				});
			});

			act(() => {
				result.current[1]({
					userName: 'john',
					lastLoginDate: '2024-01-01'
				});
			});

			act(() => {
				vi.runAllTimers();
			});

			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('filter_user-name=john')
			);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('filter_last-login-date=2024-01-01')
			);
		});
	});

	describe('browser environment', () => {
		it('should not attempt update URL when is.browser() is false', () => {
			vi.mocked(is.browser).mockReturnValue(false);

			const initialState = { count: 0 };
			const { result } = renderHook(() => {
				return useUrlState(initialState, { url: mockUrl });
			});

			act(() => {
				result.current[1]({ count: 1 });
			});

			act(() => {
				vi.runAllTimers();
			});

			expect(mockReplaceState).not.toHaveBeenCalled();
		});
	});

	describe('key management', () => {
		it('should omit specified keys when updating URL', () => {
			const initialState = { count: 0, temp: 'test', visible: true };
			const omitKeys = ['temp'];

			const { result } = renderHook(() => {
				return useUrlState(initialState, { omitKeys, url: mockUrl });
			});

			act(() => {
				result.current[1]({
					...initialState,
					count: 5,
					temp: 'ignored'
				});
			});

			act(() => {
				vi.runAllTimers();
			});

			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('count=5')
			);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.not.stringContaining('temp=ignored')
			);
		});

		it('should handle custom omit function', () => {
			const initialState = { count: 0, permanent: '', temp: '' };
			const omitKeys = (value: any, key: string) => {
				return key === 'temp';
			};

			const { result } = renderHook(() => {
				return useUrlState(initialState, { omitKeys, url: mockUrl });
			});

			act(() => {
				result.current[1]({
					count: 1,
					temp: 'ignored',
					permanent: 'saved'
				});
			});

			act(() => {
				vi.runAllTimers();
			});

			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('count=1')
			);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('permanent=saved')
			);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.not.stringContaining('temp=ignored')
			);
		});

		it('should pick specified keys when updating URL', () => {
			const initialState = { count: 0, temp: 'test', visible: true };
			const pickKeys = ['count', 'visible'];

			const { result } = renderHook(() => {
				return useUrlState(initialState, { pickKeys, url: mockUrl });
			});

			act(() => {
				result.current[1]({
					...initialState,
					count: 5,
					temp: 'ignored'
				});
			});

			act(() => {
				vi.runAllTimers();
			});

			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('count=5')
			);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.not.stringContaining('temp=ignored')
			);
		});

		it('should handle custom pick function', () => {
			const initialState = { count: 0, permanent: '', temp: '' };
			const pickKeys = (value: any, key: string) => {
				return key === 'count' || key === 'permanent';
			};

			const { result } = renderHook(() => {
				return useUrlState(initialState, { pickKeys, url: mockUrl });
			});

			act(() => {
				result.current[1]({
					count: 1,
					temp: 'ignored',
					permanent: 'saved'
				});
			});

			act(() => {
				vi.runAllTimers();
			});

			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('count=1')
			);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.stringContaining('permanent=saved')
			);
			expect(mockReplaceState).toHaveBeenCalledWith(
				{},
				'',
				expect.not.stringContaining('temp=ignored')
			);
		});
	});

	describe('value management', () => {
		describe('default empty value handling', () => {
			it('should omit null values by default', () => {
				const initialState = { name: null, age: 25 };
				const { result } = renderHook(() =>
					useUrlState(initialState, { url: mockUrl })
				);

				act(() => {
					result.current[1]({ name: null, age: 30 });
				});

				act(() => {
					vi.runAllTimers();
				});

				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.stringContaining('age=30')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('name=')
				);
			});

			it('should omit undefined values by default', () => {
				const initialState = { name: undefined, age: 25 };
				const { result } = renderHook(() =>
					useUrlState(initialState, { url: mockUrl })
				);

				act(() => {
					result.current[1]({ name: undefined, age: 30 });
				});

				act(() => {
					vi.runAllTimers();
				});

				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.stringContaining('age=30')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('name=')
				);
			});

			it('should omit empty strings by default', () => {
				const initialState = { name: '', age: 25 };
				const { result } = renderHook(() =>
					useUrlState(initialState, { url: mockUrl })
				);

				act(() => {
					result.current[1]({ name: '', age: 30 });
				});

				act(() => {
					vi.runAllTimers();
				});

				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.stringContaining('age=30')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('name=')
				);
			});

			it('should not omit zero values by default', () => {
				const initialState = { count: 0, name: 'test' };
				const { result } = renderHook(() =>
					useUrlState(initialState, { url: mockUrl })
				);

				act(() => {
					result.current[1]({ count: 0, name: 'test' });
				});

				act(() => {
					vi.runAllTimers();
				});

				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.stringContaining('count=0')
				);
			});

			it('should not omit false values by default', () => {
				const initialState = { active: false, name: 'test' };
				const { result } = renderHook(() =>
					useUrlState(initialState, { url: mockUrl })
				);

				act(() => {
					result.current[1]({ active: false, name: 'test' });
				});

				act(() => {
					vi.runAllTimers();
				});

				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.stringContaining('active=false')
				);
			});
		});

		describe('custom omitValues', () => {
			it('should omit specified values using array', () => {
				const initialState = {
					status: 'pending',
					count: 0,
					active: false
				};
				const { result } = renderHook(() =>
					useUrlState(initialState, {
						url: mockUrl,
						omitValues: ['pending', 0, false]
					})
				);

				act(() => {
					result.current[1]({
						status: 'pending',
						count: 0,
						active: false
					});
				});

				act(() => {
					vi.runAllTimers();
				});

				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('status=')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('count=')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('active=')
				);
			});

			it('should handle custom omit function', () => {
				const initialState = { count: 5, score: -1, value: 100 };
				const omitValues = (value: any) => {
					return isNumber(value) && value < 0;
				};

				const { result } = renderHook(() =>
					useUrlState(initialState, {
						url: mockUrl,
						omitValues
					})
				);

				act(() => {
					result.current[1]({ count: 5, score: -1, value: 100 });
				});

				act(() => {
					vi.runAllTimers();
				});

				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.stringContaining('count=5')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.stringContaining('value=100')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('score=')
				);
			});

			it('should combine omitValues with omitKeys and pickKeys', () => {
				const initialState = {
					name: '',
					age: 25,
					temp: 'test',
					status: null
				};

				const { result } = renderHook(() =>
					useUrlState(initialState, {
						url: mockUrl,
						omitKeys: ['temp'],
						pickKeys: ['name', 'age', 'status'],
						omitValues: [null, '']
					})
				);

				act(() => {
					result.current[1]({
						name: '',
						age: 30,
						temp: 'ignored',
						status: null
					});
				});

				act(() => {
					vi.runAllTimers();
				});

				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.stringContaining('age=30')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('name=')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('temp=')
				);
				expect(mockReplaceState).toHaveBeenCalledWith(
					{},
					'',
					expect.not.stringContaining('status=')
				);
			});
		});
	});

	describe('error handling', () => {
		it('should handle failing URL updates gracefully', () => {
			const onError = vi.fn();
			const initialState = { value: {} };
			const { result } = renderHook(() => {
				return useUrlState(initialState, { onError, url: mockUrl });
			});

			act(() => {
				const circular: any = {};
				circular.self = circular;
				result.current[1]({ value: circular });
			});

			act(() => {
				vi.runAllTimers();
			});

			expect(onError).toHaveBeenCalledWith(expect.any(Error));
		});
	});
});
