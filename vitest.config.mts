import { defineConfig } from 'vite';
import path from 'path';
import reactPlugin from '@vitejs/plugin-react';

const viteConfig = defineConfig(() => {
	return {
		plugins: [reactPlugin()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src')
			}
		},
		test: {
			coverage: {
				exclude: [
					'dist',
					'eslint.config.mjs',
					'src/index.ts',
					'src/is.ts',
					'src/types.ts',
					'vitest.config.mts',
					'vite.config.mts'
				]
			},
			environment: 'jsdom',
			include: ['**/*.spec.*'],
			setupFiles: [path.resolve('vitest.setup.ts')]
		}
	};
});

export default viteConfig;
