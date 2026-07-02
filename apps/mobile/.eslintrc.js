/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', '@tanstack/query', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@tanstack/eslint-plugin-query/recommended',
  ],
  env: {
    es2022: true,
  },
  rules: {
    // TanStack Query rules (from plugin) enforce correct hook usage:
    // - exhaustive-deps  → queryKey must list every variable used inside queryFn
    // - no-rest-destructuring → don't spread `...rest` on query results (hides unused props)
    // - stable-query-client  → QueryClient must not be created inside a component
    '@tanstack/query/exhaustive-deps': 'error',
    '@tanstack/query/no-rest-destructuring': 'warn',
    '@tanstack/query/stable-query-client': 'error',

    // React hooks correctness — guards against stale closures and missing deps.
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Guard against re-introducing the old useEffect+setState data-fetching pattern.
    // This rule is intentionally 'warn' so legitimate useEffect usage (animations,
    // subscriptions, form-reset on modal open) is not blocked — it just flags
    // reviewers to double-check whether TanStack Query should be used instead.
    'no-restricted-syntax': [
      'warn',
      {
        // Catches: useEffect(() => { ... setXxx(data) ... }, [...])
        // where the setter name ends with common data-state suffixes.
        selector:
          "CallExpression[callee.name='useEffect'] > ArrowFunctionExpression > BlockStatement > ExpressionStatement > CallExpression[callee.name=/^set(Data|Loading|Error|Items|List|Results|Members|Sessions|Announcements|Workouts)$/]",
        message:
          'Prefer useQuery / useMutation over useEffect + setState for server data. See docs/03-engineering/frontend-data-fetching.md.',
      },
    ],

    // Keep TypeScript strict but not pedantic.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'error',
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'metro.config.js', 'babel.config.js'],
};
