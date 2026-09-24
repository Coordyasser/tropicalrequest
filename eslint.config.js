import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // O Supabase corta silenciosamente toda resposta em 1000 linhas. Um
      // `.select()` sem paginação não dá erro: só devolve dados a menos.
      // Use `fetchAll`/`fetchAllIn` de @/lib/fetchAll.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "AwaitExpression:has(MemberExpression[object.name='supabase'])" +
            ":has(CallExpression[callee.property.name='select'])" +
            ":not(:has(CallExpression[callee.property.name=/^(range|limit|single|maybeSingle)$/]))" +
            ":not(:has(Property[key.name='head']))",
          message:
            "Query Supabase sem paginação: o PostgREST corta em 1000 linhas sem avisar. " +
            "Use fetchAll()/fetchAllIn() de @/lib/fetchAll, ou .single()/.limit()/count head:true se for intencional.",
        },
      ],
    },
  },
);
