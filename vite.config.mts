import dts from 'vite-plugin-dts';
import { defineConfig, UserConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig(env => {
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
				entry: './src/index.ts',
				formats: ['es']
			},
			rollupOptions: {
				external: [
					'lodash/debounce',
					'lodash/isEmpty',
					'lodash/isEqual',
					'lodash/isFunction',
					'lodash/isMap',
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
					'react/jsxRuntime',
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
				include: ['./src/*'],
				rollupTypes: true,
				tsconfigPath: './tsconfig.app.json'
			})
		];
	}

	return config;
});
