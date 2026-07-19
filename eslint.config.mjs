// ESLint flat config。
// 设计意图：用最小规则集守住宪章红线（禁止 any、TS 严格），
// 代码风格交给 Prettier（eslint-config-prettier 关闭冲突规则），避免两套工具打架。
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'coverage/',
      'miniprogram/miniprogram_npm/',
      'cloud/functions/**/node_modules/',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // 根目录 CJS 配置文件（commitlint 等）运行在 Node 环境
    files: ['*.config.js'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    // 云函数运行在云端 Node（CJS）环境，console 输出进入云函数日志
    files: ['cloud/functions/**/*.js'],
    languageOptions: {
      globals: {
        module: 'writable',
        exports: 'writable',
        require: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // 云函数为 CJS/Node 运行时，require 是官方标准用法（仅限本目录，小程序端仍禁）
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    rules: {
      // 宪章红线：禁止 any（TypeScript 章节）
      '@typescript-eslint/no-explicit-any': 'error',
      // 禁止未使用代码（质量清单）
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
);
