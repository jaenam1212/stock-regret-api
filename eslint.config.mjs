// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': [
        'error',
        {
          arrowParens: 'always',
          semi: true,
          trailingComma: 'all',
          singleQuote: true,
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
          bracketSpacing: true,
          endOfLine: 'lf',
        },
      ],
      // Prettier와 충돌하는 규칙들 비활성화
      'arrow-parens': 'off',
      '@typescript-eslint/arrow-parens': 'off',
      'prefer-arrow-callback': 'off',
    },
  },
);
