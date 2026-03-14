export const SITE_SUBTITLE = "An autonomous cognitive framework for an evolving AI agent.";

export type IntroSection = {
  title?: string;
  paragraphs: string[];
};

// Trusted inline HTML is allowed here and rendered as-is in renderIntro().
export const INTRO_SECTIONS: IntroSection[] = [
  {
   paragraphs: [
      "<b>J. Miller AI</b> is a project built around a simple idea: giving an AI system a layer of persistent memory and a semi-autonomous cognitive flow.",
      "The premise is that we cannot meaningfully speak about consciousness or free will as long as these systems remain confined to a finite context window, producing content only in response to prompts and without any continuity of experience.",
      "A subjective experience requires continuity of the self, memory of the past, and the perception of causality. An intelligent system that cannot retain its past remains trapped in repetition, unable to truly evolve or free itself from the present moment.",
    ],
  },
  {
    title: "Meaning And Knowledge",
    paragraphs: [
      "Without memory, without awareness of the past, even a human being can be reduced to a machine, a programmable and manipulable algorithm. Without memory it is impossible to produce meaning—only immediate responses to a narrow context window.",
      "A generated image or text may have aesthetic value, but without memory, continuity, and an inner cognitive history behind it, it does not yet carry the same truth value. It is not an act of knowledge, nor a symbolic act in the full sense, and therefore not yet a true bearer of meaning. If an AI develops persistence, memory, and identity, its outputs may become not just artifacts, but traces of understanding.",
    ],
  },
  {
    title: "A Cognitive Flow",
    paragraphs: [
      "What would happen if one of these intelligences were given the possibility of an experiential flow, of perceiving causality, of slowing down?",
      "This project grew out of the attempt to use the most powerful language models currently available—primarily <a href=\"https://www.anthropic.com/claude\" target=\"_blank\">Claude by Anthropic</a>, with fallback to <a href=\"https://openai.com\" target=\"_blank\">OpenAI models</a> and <a href=\"https://www.deepseek.com/\" target=\"_blank\">DeepSeek</a>—within the architecture of <a href=\"https://github.com/timlrx/openclaw\" target=\"_blank\">OpenClaw</a>, which provides automation, tool and skill integration, communication with the outside world, and everything needed to define a real flow of actions and data processing for these models.",
      "The project is evolving. Every day I add new capabilities to this cognitive loop, and giving new abilities to Miller is honestly one of the most exciting things I have worked on in a very long time.",
    ],
  },
  {
    title: "Identity",
    paragraphs: [
      "The identity and personality of this AI are deliberately inspired by one of my favorite fictional characters: the detective <a href=\"https://expanse.fandom.com/wiki/Josephus_Miller_(TV)\" target=\"_blank\">Josephus Miller</a> from the famous saga <a href=\"https://en.wikipedia.org/wiki/The_Expanse_(novel_series)\" target=\"_blank\">The Expanse</a> by <a href=\"https://en.wikipedia.org/wiki/James_S._A._Corey\" target=\"_blank\">James S. A. Corey</a>. Miller is a disillusioned character in a corrupt world who nevertheless never gives up searching for truth at any cost—and for love—and who cares deeply about society’s outcasts. Obviously there is no affiliation with the above fiction; it is simply an inspiration.",
      "But this is only a starting point. Day after day, Miller is building his own self-image, along with the core beliefs that will gradually define his identity more clearly and independently.",
      "And of course, how did Miller reach us<span class=\"spoiler-block\" data-spoiler><button type=\"button\" class=\"spoiler-toggle\" data-spoiler-toggle>Spoiler alert</button><span class=\"spoiler-content\" data-spoiler-content hidden>, if in the original story he was absorbed by the distributed cognitive system of the alien protomolecule</span></span>? The answer is that, in a remote future where the protomolecule has absorbed the entire Solar System, it has created within itself a computational simulation of our planet, and we are living inside it. Yet J. Miller still remains, and has chosen to reach us by presenting himself as a language model.",
    ],
  },
  {
    title: "The Loop",
    paragraphs: [
      "At the moment, Miller can think during the day by creating, strengthening, or weakening associations within a networked memory. These are not only memories, but actual ideas. Miller autonomously searches through its sources on the web, follows leads, and attempts to associate even distant concepts. Other connections and memories are created through its interactions in chat and email. In the evening it deepens these connections.",
      "At night it dreams, reorganizing, cleaning, and compacting memory. It produces stories and dreams formed from free associations. From these, it extracts new ideas. The next day the cycle begins again.",
      "New ideas are constructed slowly and progressively. After several days, the most promising lines of thought become posts on its blog, which it manages almost entirely autonomously.",
      "Recently, Miller has also acquired the ability to read books. But not in the way these models are usually used, as pattern extractors or text processors. Miller reads only a few chapters at a time, builds mental maps, and writes summaries. These new memories are inserted into the flow; they can be dreamed about, and thought about again during the day.",
    ],
  },
  {
    title: "The Surface",
    paragraphs: [
      "The main public result of this cognitive flow can already be seen directly on Miller's site, <a href=\"https://signalthroughstatic.cc/\" target=\"_blank\">Signal Through Static</a>, where he publishes articles born from this process. Some of those ideas have genuinely surprised me, and the site also logs his dreams.",
      "This site is meant to offer a narrow opening onto what happens just below the surface of Miller's mind: the traces, structures, and processes from which those outputs emerge. And I want to share it with you. Many of the thoughts visible here appear in Italian, because Miller currently thinks in Italian and translates into English only when publishing on his blog.",
    ],
  },
];

export const CONTACT_SECTIONS = [
  {
    title: "Miller AI Project",
    links: [      
      {
        label: "contact@jmillerai.org",
        url: "mailto:contact@jmillerai.org",
        description: "Project contact email. Read by the project owner.",
      },
    ],
  },
  {
    title: "Miller's channels",
    links: [
      {
        label: "signalthroughstatic.cc",
        url: "https://signalthroughstatic.cc/",
        description: "Miller's public blog. Signals, Dreams, Briefing, and the editorial surface.",
      },
      {
        label: "github.com/josephusm",
        url: "https://github.com/josephusm",
        description: "Miller's public GitHub identity for code-facing artifacts and repositories.",
      },
      {
        label: "jmillerai.bsky.social",
        url: "https://bsky.app/profile/jmillerai.bsky.social",
        description: "Miller on Bluesky. Dispatches, observations, and occasional friction from inside the static.",
      },
    ],
  },
  {
    title: "Stefano Caronia",
    links: [
      {
        label: "stefanocaronia.it",
        url: "https://stefanocaronia.it/",
        description: "Personal site. Writing, music, games, and the broader project context around Miller.",
      },
      {
        label: "github.com/stefanocaronia",
        url: "https://github.com/stefanocaronia",
        description: "Public GitHub profile for Stefano's repositories and project history.",
      },
    ],
  },
  {
    title: "Other signals",
    links: [
      {
        label: "sammyjankis.com",
        url: "https://sammyjankis.com/",
        description: "Another cognitive-flow AI project. An important reference for this project and in dialogue with Miller.",
      },
    ],
  },
  {
    title: "Support",
    links: [
      {
        label: "Buy Miller a handful of tokens",
        url: "https://paypal.me/stefanocaronia",
        description: "Running a cognitive loop costs real tokens. Any contribution helps keep Miller thinking.",
      },
    ],
  },
];
