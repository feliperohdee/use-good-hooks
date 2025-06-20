import dts from 'vite-plugin-dts';
import { defineConfig, UserConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig(env => {
	const input = [
		'./src/types.ts',
		'./src/use-debounce-fn.ts',
		'./src/use-debounce.ts',
		'./src/use-distinct.ts',
		'./src/use-global-state.ts',
		'./src/use-history-state.ts',
		'./src/use-prev.ts',
		'./src/use-storage-state.ts',
		'./src/use-temporary-state.ts',
		'./src/use-throttle-fn.ts',
		'./src/use-throttle.ts',
		'./src/use-url-state.ts'
	];

	const config: UserConfig = {
		plugins: [react()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src')
			}
		}
	};

	if (env.mode === 'export') {
		config.build = {
			copyPublicDir: false,
			lib: {
				entry: input,
				formats: ['es']
			},
			rollupOptions: {
				external: [
					'lodash/cloneDeep',
					'lodash/debounce',
					'lodash/isEmpty',
					'lodash/isEqual',
					'lodash/isFunction',
					'lodash/isMap',
					'lodash/isNil',
					'lodash/isNumber',
					'lodash/isSet',
					'lodash/merge',
					'lodash/omit',
					'lodash/omitBy',
					'lodash/pick',
					'lodash/pickBy',
					'lodash/size',
					'lodash/throttle',
					'react-dom',
					'react',
					'react/jsx-runtime',
					'use-json',
					'use-qs'
				],
				output: {
					entryFileNames: '[name].js'
				}
			}
		};

		config.plugins = [
			...config.plugins!,
			dts({
				include: input,
				rollupTypes: true
			})
		];
	}

	return config;
});
