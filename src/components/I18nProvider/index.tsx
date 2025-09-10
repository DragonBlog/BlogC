import { i18n } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { useEffect } from "react";
import { Language, useAppStore } from "@/store/useAppStore";

i18n.activate("zh");

// 动态加载语言包并激活
async function dynamicActivate(locale: Language) {
  const { messages } = await import(`../../locales/${locale}/messages.po`);

  i18n.load(locale, messages);
  i18n.activate(locale);
}

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale] = useAppStore((store) => [store.language]);

  // 当 locale 变化时，动态加载对应的语言包
  useEffect(() => {
    dynamicActivate(locale);
  }, [locale]);

  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
};
