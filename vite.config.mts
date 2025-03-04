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
				entry: './src/index-export.ts',
				fileName: 'index',
				formats: ['es']
			},
			rollupOptions: {
				external: [
					'lodash',
					'react-dom',
					'react',
					'react/jsxRuntime',
					'use-json',
					'use-qs'
				]
			}
		};

		config.plugins = [
			...config.plugins!,
			dts({
				copyDtsFiles: true,
				exclude: ['**/*.spec.*'],
				include: [
					'./src/hooks/*',
					'./src/types.ts',
					'./src/index-export.ts'
				],
				rollupTypes: true,
				tsconfigPath: './tsconfig.app.json'
			})
		];
	}

	return config;
});
