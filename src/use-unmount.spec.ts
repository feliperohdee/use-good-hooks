import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';

import useUnmount from '@/use-unmount';

describe('/use-unmount', () => {
	it('should call the latest fn on unmount', async () => {
		const fn1 = vi.fn();
		const fn2 = vi.fn();
		const { rerender, unmount } = renderHook(
			({ fn }) => {
				useUnmount(fn);
			},
			{ initialProps: { fn: fn1 } }
		);

		rerender({ fn: fn2 });
		unmount();
		await Promise.resolve();

		expect(fn1).not.toHaveBeenCalled();
		expect(fn2).toHaveBeenCalledOnce();
	});

	it('should not call fn on Strict Mode remount', async () => {
		const fn = vi.fn();
		const { unmount } = renderHook(
			() => {
				useUnmount(fn);
			},
			{ wrapper: StrictMode }
		);

		await Promise.resolve();
		expect(fn).not.toHaveBeenCalled();

		unmount();
		await Promise.resolve();
		expect(fn).toHaveBeenCalledOnce();
	});
});
