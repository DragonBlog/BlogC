import { i18n } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  i18n.activate("zh");
  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
};
