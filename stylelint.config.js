/** @type {import('stylelint').Config} */
export default {
  ignoreFiles: [
    "**/node_modules/**",
    "**/dist/**",
    "**/src-tauri/**",
    "src/App.css",
  ],
  extends: ["stylelint-config-standard"],
  customSyntax: "postcss-less",
};
