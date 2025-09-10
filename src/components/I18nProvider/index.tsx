import { i18n } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { useEffect } from "react";
import { Language, useAppStore } from "@/store/useAppStore";

// 默认激活中文语言包
i18n.activate("zh");

/**
 * 动态加载语言包并激活指定语言
 *
 * @param locale - 需要激活的语言代码 (如 'zh', 'en')
 *
 * 该函数会:
 * 1. 异步导入指定语言的翻译文件
 * 2. 将翻译消息加载到i18n实例中
 * 3. 激活指定语言
 */
async function dynamicActivate(locale: Language) {
  // 动态导入语言包文件
  const { messages } = await import(`../../locales/${locale}/messages.po`);

  // 加载语言包到i18n核心实例
  i18n.load(locale, messages);
  // 激活指定语言
  i18n.activate(locale);
}

/**
 * 国际化提供者组件
 *
 * 该组件负责:
 * 1. 监听应用语言设置的变化
 * 2. 动态加载并激活对应的语言包
 * 3. 为子组件提供国际化上下文
 *
 * @param children - 子组件
 */
export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  // 从应用状态中获取当前语言设置
  const [locale] = useAppStore((store) => [store.language]);

  // 当 locale 变化时，动态加载对应的语言包
  useEffect(() => {
    dynamicActivate(locale);
  }, [locale]);

  // 提供国际化上下文给子组件
  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
};
