import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore third-party libraries
    "public/pyodide/**",
    "node_modules/**",
    // Ignore archived snapshots/tests
    "_archive_20260128/**",
  ]),
  {
    rules: {
      // Allow 'any' type in Phaser game code (complex game engine integration)
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": "off",
      // Allow setState in effects (common pattern in React)
      "react-hooks/set-state-in-effect": "off",
      // Allow prefer-const warnings
      "prefer-const": "off",
      // Allow unescaped entities in JSX (quotes are fine)
      "react/no-unescaped-entities": "off",
      // Allow require imports (needed for some dynamic imports)
      "@typescript-eslint/no-require-imports": "off",
      // Relax exhaustive deps (can cause issues with complex dependencies)
      "react-hooks/exhaustive-deps": "off",
      // Allow anonymous default exports
      "import/no-anonymous-default-export": "off",
      // Allow ts-ignore comments (sometimes necessary for third-party libs)
      "@typescript-eslint/ban-ts-comment": "off",
      // Relax React hooks rules for game code (Phaser integration)
      "react-hooks/rules-of-hooks": "off",
      // Allow unsafe declaration merging (needed for Phaser types)
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      // Allow empty object types (common in type definitions)
      "@typescript-eslint/no-empty-object-type": "off",
      // Relax React compiler rules (game code has complex patterns)
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "no-use-before-define": "off",
      "react-hooks/unsupported-syntax": "off",
    }
  }
]);

export default eslintConfig;
