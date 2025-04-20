import js from '@eslint/js';
import globals from 'globals';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['coverage', 'dist', 'src/components/ui']
	},
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser
		},
		plugins: {
			'react-hooks': reactHooksPlugin,
			'react-refresh': reactRefreshPlugin
		},
		rules: {
			...reactHooksPlugin.configs.recommended.rules,
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'prefer-const': 'off'
		}
	}
);
