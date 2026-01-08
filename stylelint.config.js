/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    // Allow Tailwind directives
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "config",
          "theme",
          "variant",
          "source",
          "utility",
          "plugin"
        ],
      },
    ],
    // Allow Tailwind theme() function
    "function-no-unknown": [
      true,
      {
        ignoreFunctions: ["theme"],
      },
    ],
    // Disable rules that conflict with Tailwind
    "import-notation": null,
    "no-descending-specificity": null,
  },
};
