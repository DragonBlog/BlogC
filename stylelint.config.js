/** @type {import('stylelint').Config} */
export default {
  ignoreFiles: ["**/node_modules/**", "**/dist/**", "**/src-tauri/**"],
  extends: ["stylelint-config-standard"],
  customSyntax: "postcss-less",
};
