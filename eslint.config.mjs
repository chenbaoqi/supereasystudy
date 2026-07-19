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
    rules: {
      // 宪章红线：禁止 any（TypeScript 章节）
      '@typescript-eslint/no-explicit-any': 'error',
      // 禁止未使用代码（质量清单）
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
);
