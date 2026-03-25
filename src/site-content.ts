import { t } from "./strings";

export const CONTACT_SECTIONS = () => [
  {
    key: "millers-channels",
    title: t("contacts.millersChannels"),
    subtitle: t("contacts.millersChannelsDesc"),
    links: [
      {
        label: "signalthroughstatic.cc",
        url: "https://signalthroughstatic.cc/",
        description: t("contacts.signalDesc"),
      },
      {
        label: "github.com/josephusm",
        url: "https://github.com/josephusm",
        description: t("contacts.githubDesc"),
      },
      {
        label: "jmillerai.bsky.social",
        url: "https://bsky.app/profile/jmillerai.bsky.social",
        description: t("contacts.blueskyDesc"),
      },
    ],
  },
  {
    key: "other-signals",
    title: t("contacts.otherSignals"),
    subtitle: t("contacts.otherSignalsDesc"),
    links: [],
  },
  {
    key: "humans",
    title: t("contacts.humans"),
    subtitle: t("contacts.humansDesc"),
    links: [
      {
        label: "contact@jmillerai.org",
        url: "mailto:contact@jmillerai.org",
        description: t("contacts.contactEmailDesc"),
      },
      {
        label: "stefanocaronia.it",
        url: "https://stefanocaronia.it/",
        description: t("contacts.personalSiteDesc"),
      },
      {
        label: "github.com/stefanocaronia",
        url: "https://github.com/stefanocaronia",
        description: t("contacts.githubProfileDesc"),
      },
    ],
  },
  {
    key: "support",
    title: t("contacts.support"),
    subtitle: t("contacts.supportDesc"),
    links: [
      {
        label: t("contacts.buyTokens"),
        url: "https://paypal.me/stefanocaronia",
        description: t("contacts.buyTokensDesc"),
      },
    ],
  },
];
