import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';

import usePrev from '@/hooks/use-prev';

describe('/hooks/use-prev', () => {
	describe('basic functionality', () => {
		it('should return initial on first render', () => {
			const { result } = renderHook(() => {
				return usePrev('initial');
			});
			expect(result.current).toBeUndefined();
		});

		it('should return previous string value after update', () => {
			const { result, rerender } = renderHook(
				({ value }) => {
					return usePrev(value);
				},
				{ initialProps: { value: 'initial' } }
			);

			expect(result.current).toBeUndefined();
			rerender({ value: 'updated' });
			expect(result.current).toEqual('initial');
			rerender({ value: 'updated again' });
			expect(result.current).toEqual('updated');
		});

		it('should handle multiple updates', () => {
			const { result, rerender } = renderHook(
				({ value }) => {
					return usePrev(value);
				},
				{ initialProps: { value: 1 } }
			);

			expect(result.current).toBeUndefined();
			rerender({ value: 2 });
			expect(result.current).toEqual(1);
			rerender({ value: 3 });
			expect(result.current).toEqual(2);
			rerender({ value: 4 });
			expect(result.current).toEqual(3);
		});
	});

	describe('complex types', () => {
		it('should handle object values', () => {
			const { result, rerender } = renderHook(
				({ value }) => {
					return usePrev(value);
				},
				{ initialProps: { value: { foo: 'bar' } } }
			);

			expect(result.current).toBeUndefined();

			const newValue = { foo: 'baz' };
			rerender({ value: newValue });
			expect(result.current).toEqual({ foo: 'bar' });
		});
	});

	describe('edge cases', () => {
		it('should handle null values', () => {
			const { result, rerender } = renderHook(
				({ value }) => {
					return usePrev(value);
				},
				{ initialProps: { value: null } }
			);

			expect(result.current).toBeUndefined();
			// @ts-expect-error
			rerender({ value: 'notNull' });
			expect(result.current).toBeNull();
			rerender({ value: null });
			expect(result.current).toEqual('notNull');
		});

		it('should handle undefined values', () => {
			const { result, rerender } = renderHook(
				({ value }) => {
					return usePrev(value);
				},
				{ initialProps: { value: undefined } }
			);

			expect(result.current).toBeUndefined();
			// @ts-expect-error
			rerender({ value: 'defined' });
			expect(result.current).toBeUndefined();
			rerender({ value: undefined });
			expect(result.current).toEqual('defined');
		});
	});
});
