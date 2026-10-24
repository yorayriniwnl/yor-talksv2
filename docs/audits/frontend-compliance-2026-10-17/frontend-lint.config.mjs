// Audit-only lint config; install the pinned tools in an isolated directory.
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(path.join(process.env.FRONTEND_LINT_TOOL_DIR,'package.json'));
const parser=require('@typescript-eslint/parser');
export default [{
  files:['social/src/**/*.{ts,tsx}','social/scripts/**/*.mjs','social/public/sw.js','social/vite.config.ts'],
  languageOptions:{parser,ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}}},
  linterOptions:{noInlineConfig:true,reportUnusedDisableDirectives:false},
  rules:{
    'constructor-super':'error','no-async-promise-executor':'error','no-constant-binary-expression':'error',
    'no-debugger':'error','no-dupe-args':'error','no-dupe-else-if':'error','no-dupe-keys':'error',
    'no-duplicate-case':'error','no-fallthrough':'error','no-self-assign':'error',
    'no-unexpected-multiline':'error','no-unreachable':'error','no-unsafe-finally':'error',
    'no-unsafe-negation':'error','use-isnan':'error','valid-typeof':'error'
  }
}];
