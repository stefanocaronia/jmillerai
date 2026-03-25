/// <reference types="vite/client" />

declare module "virtual:devlog-posts" {
  interface DevlogPost {
    slug: string;
    title: string;
    title_it?: string;
    date: string;
    time: string;
    author: string;
    html: string;
    html_it?: string;
  }
  const posts: DevlogPost[];
  export default posts;
}

declare module "virtual:intro-sections" {
  interface IntroSection {
    title?: string;
    html: string;
  }
  interface IntroData {
    en: IntroSection[];
    it: IntroSection[];
  }
  const data: IntroData;
  export default data;
}

declare module "virtual:i18n" {
  type LangPair = { en: string; it: string };
  type DimensionEntry = { it: string; desc_it: string };
  interface I18nData {
    [section: string]: {
      [key: string]: LangPair | DimensionEntry | string;
    };
  }
  const data: I18nData;
  export default data;
}
