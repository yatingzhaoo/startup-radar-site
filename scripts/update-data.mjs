import { XMLParser } from "fast-xml-parser";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../src/data/feed.json", import.meta.url);
const TODAY = currentLosAngelesDate();
let cachedCompanies;

function currentLosAngelesDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

const SOURCES = {
  yc: "https://raw.githubusercontent.com/yc-oss/api/main/companies/all.json",
  hn: "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=30&query=startup",
  hnLaunch: "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=30&query=Launch%20HN",
  productHunt: "https://www.producthunt.com/feed",
  techCrunchStartups: "https://techcrunch.com/category/startups/feed/",
  techCrunchAI: "https://techcrunch.com/category/artificial-intelligence/feed/",
  techCrunchMain: "https://techcrunch.com/feed/"
};

const CURATED_HARDWARE_COMPANIES = [
  {
    id: "hardware-plaud",
    name: "Plaud",
    website: "https://www.plaud.ai/",
    sourceUrl: "https://www.plaud.ai/",
    oneLiner: "AI voice recorder hardware for meetings, calls, and personal notes.",
    description:
      "Plaud makes small recording devices and companion software that turn meetings, calls, and spoken thoughts into organized notes and summaries.",
    published: "2026-06-01"
  },
  {
    id: "hardware-rabbit",
    name: "Rabbit",
    website: "https://www.rabbit.tech/",
    sourceUrl: "https://www.rabbit.tech/",
    oneLiner: "A pocket AI device designed around voice, camera, and task assistance.",
    description:
      "Rabbit builds a dedicated AI hardware device that lets people ask questions, use the camera, and try lightweight assistant workflows without opening a phone app.",
    published: "2026-06-02"
  },
  {
    id: "hardware-limitless",
    name: "Limitless",
    website: "https://www.limitless.ai/",
    sourceUrl: "https://www.limitless.ai/",
    oneLiner: "Wearable AI pendant and meeting memory product.",
    description:
      "Limitless builds a wearable and software layer for remembering conversations, summarizing meetings, and helping people search what was said later.",
    published: "2026-06-03"
  },
  {
    id: "hardware-brilliant-labs",
    name: "Brilliant Labs",
    website: "https://brilliant.xyz/",
    sourceUrl: "https://brilliant.xyz/",
    oneLiner: "Open AI glasses and lightweight wearable computing devices.",
    description:
      "Brilliant Labs makes AI glasses and developer-friendly wearable hardware that can bring camera, display, and assistant functions closer to everyday use.",
    published: "2026-06-04"
  },
  {
    id: "hardware-halliday",
    name: "Halliday",
    website: "https://www.hallidayglobal.com/",
    sourceUrl: "https://www.hallidayglobal.com/",
    oneLiner: "AI glasses that put lightweight information in the user's field of view.",
    description:
      "Halliday works on smart glasses that combine a small display, voice interaction, and assistant features for translation, reminders, and everyday information.",
    published: "2026-06-05"
  },
  {
    id: "hardware-even-realities",
    name: "Even Realities",
    website: "https://www.evenrealities.com/",
    sourceUrl: "https://www.evenrealities.com/",
    oneLiner: "Smart glasses focused on daily information, translation, and lightweight assistance.",
    description:
      "Even Realities makes smart glasses that try to be closer to normal eyewear while adding translation, navigation, and personal information features.",
    published: "2026-06-06"
  },
  {
    id: "hardware-friend",
    name: "Friend",
    website: "https://www.friend.com/",
    sourceUrl: "https://www.friend.com/",
    oneLiner: "A wearable AI companion device.",
    description:
      "Friend is building a small wearable device around always-available companionship, voice interaction, and a different style of consumer AI interface.",
    published: "2026-06-07"
  },
  {
    id: "hardware-omi",
    name: "Omi",
    website: "https://www.omi.me/",
    sourceUrl: "https://www.omi.me/",
    oneLiner: "Wearable AI device for memory, voice notes, and assistant workflows.",
    description:
      "Omi works on a wearable AI device that records context, turns spoken information into memory, and connects that memory to assistant-style software.",
    published: "2026-06-08"
  },
  {
    id: "hardware-based-hardware",
    name: "Based Hardware",
    website: "https://www.basedhardware.com/",
    sourceUrl: "https://www.basedhardware.com/",
    oneLiner: "Open wearable AI hardware for builders.",
    description:
      "Based Hardware focuses on wearable AI devices and developer-friendly hardware kits for people experimenting with always-on personal assistants.",
    published: "2026-06-09"
  },
  {
    id: "hardware-whoop",
    name: "Whoop",
    website: "https://www.whoop.com/",
    sourceUrl: "https://www.whoop.com/",
    oneLiner: "Wearable health and performance tracking hardware.",
    description:
      "Whoop makes a wearable that tracks recovery, sleep, strain, and health signals, then turns that data into coaching for athletes and everyday users.",
    published: "2026-06-10"
  },
  {
    id: "hardware-oura",
    name: "Oura",
    website: "https://ouraring.com/",
    sourceUrl: "https://ouraring.com/",
    oneLiner: "Smart ring for sleep, readiness, and health tracking.",
    description:
      "Oura builds a smart ring that collects sleep and body signals, then helps users understand recovery, readiness, and longer-term health patterns.",
    published: "2026-06-11"
  },
  {
    id: "hardware-eight-sleep",
    name: "Eight Sleep",
    website: "https://www.eightsleep.com/",
    sourceUrl: "https://www.eightsleep.com/",
    oneLiner: "Smart sleep hardware that adjusts bed temperature and tracks sleep.",
    description:
      "Eight Sleep makes connected sleep hardware that changes temperature through the night and uses sleep data to improve rest and recovery.",
    published: "2026-06-12"
  }
];

const CURATED_NON_YC_COMPANIES = [
  {
    id: "non-yc-anysphere",
    name: "Anysphere",
    website: "https://www.cursor.com/",
    sourceUrl: "https://www.cursor.com/",
    oneLiner: "AI code editor that helps developers write, navigate, and change code.",
    description:
      "Anysphere builds Cursor, a code editor designed around AI-assisted programming, where engineers can ask questions about a codebase and make larger changes with model help.",
    published: "2026-06-13"
  },
  {
    id: "non-yc-harvey",
    name: "Harvey",
    website: "https://www.harvey.ai/",
    sourceUrl: "https://www.harvey.ai/",
    oneLiner: "AI platform for legal and professional services work.",
    description:
      "Harvey builds AI tools for lawyers and professional services teams, focusing on research, drafting, document analysis, and workflows that need accuracy and auditability.",
    published: "2026-06-14"
  },
  {
    id: "non-yc-sierra",
    name: "Sierra",
    website: "https://sierra.ai/",
    sourceUrl: "https://sierra.ai/",
    oneLiner: "AI agents for customer service and enterprise workflows.",
    description:
      "Sierra helps companies build customer-facing AI agents that can answer questions, take actions, and connect to business systems without acting like a generic chatbot.",
    published: "2026-06-15"
  },
  {
    id: "non-yc-hebbia",
    name: "Hebbia",
    website: "https://www.hebbia.ai/",
    sourceUrl: "https://www.hebbia.ai/",
    oneLiner: "AI workspace for analyzing large sets of documents.",
    description:
      "Hebbia helps finance, legal, and research teams read across many documents, find evidence, compare answers, and make decisions from messy knowledge work.",
    published: "2026-06-16"
  },
  {
    id: "non-yc-clay",
    name: "Clay",
    website: "https://www.clay.com/",
    sourceUrl: "https://www.clay.com/",
    oneLiner: "Data enrichment and go-to-market automation platform.",
    description:
      "Clay gives sales and growth teams a way to gather customer data, enrich leads, and build outbound workflows without stitching together many small tools.",
    published: "2026-06-17"
  },
  {
    id: "non-yc-cognition",
    name: "Cognition",
    website: "https://www.cognition.ai/",
    sourceUrl: "https://www.cognition.ai/",
    oneLiner: "AI software engineering agents.",
    description:
      "Cognition works on AI systems that can take on software engineering tasks, plan changes, use developer tools, and move beyond single code suggestions.",
    published: "2026-06-18"
  },
  {
    id: "non-yc-elevenlabs",
    name: "ElevenLabs",
    website: "https://elevenlabs.io/",
    sourceUrl: "https://elevenlabs.io/",
    oneLiner: "AI voice generation and audio platform.",
    description:
      "ElevenLabs builds voice models and audio tools for narration, dubbing, agents, and media workflows where realistic generated speech matters.",
    published: "2026-06-19"
  },
  {
    id: "non-yc-lovable",
    name: "Lovable",
    website: "https://lovable.dev/",
    sourceUrl: "https://lovable.dev/",
    oneLiner: "AI product builder for turning prompts into applications.",
    description:
      "Lovable lets people describe an app or product idea and generate working software faster, especially for early prototypes and small product teams.",
    published: "2026-06-20"
  }
];

const EVERGREEN_READINGS = [
  {
    id: "classic-pg-ds",
    title: "Do Things that Don't Scale",
    url: "https://www.paulgraham.com/ds.html",
    source: "Paul Graham",
    topic: "早期产品和用户",
    story:
      "早期产品最容易被误解的一点，这篇讲得很清楚。刚开始的公司不要急着把一切自动化，也不要太早追求看起来很规模化的增长。创始人应该亲自找用户、亲自服务用户，甚至做一些看起来很笨的事情。对产品判断来说，这篇文章有用的地方在于它提醒你，早期产品的核心不是流程漂亮，而是能不能让一小群人真的喜欢。"
  },
  {
    id: "classic-pg-startupideas",
    title: "How to Get Startup Ideas",
    url: "https://www.paulgraham.com/startupideas.html",
    source: "Paul Graham",
    topic: "创业想法和用户问题",
    story:
      "判断一个创业想法是不是从真实问题里长出来，这篇很有帮助。它的重点不是教你坐在房间里想点子，而是提醒你去观察自己或身边人反复遇到的麻烦。读它的时候，可以把每天看到的新公司反过来问一遍，它解决的是不是一个真实存在的问题，还是只是一个听起来很聪明的概念。"
  },
  {
    id: "classic-intercom-no",
    title: "Product strategy means saying no",
    url: "https://www.intercom.com/blog/product-strategy-means-saying-no/",
    source: "Intercom",
    topic: "产品策略和取舍",
    story:
      "产品策略里最难的一件事是拒绝，这篇讲得很直接。一个产品团队每天都会听到很多需求，每个需求单独看都可能合理，但都做进去以后，产品就会变得松散。Intercom 这篇文章的价值在于，它把策略讲得很朴素。策略不是把所有机会都排进路线图，而是决定哪些事情不做。"
  },
  {
    id: "classic-intercom-growing",
    title: "Product strategy in a growing company",
    url: "https://www.intercom.com/blog/videos/talk-product-strategy-in-a-growing-company/",
    source: "Intercom",
    topic: "增长阶段的产品策略",
    story:
      "产品变大以后，策略为什么必须变化，这篇解释得很好。一个产品刚上线时，团队是在为自己想象中的用户设计；等真实用户开始大量使用，团队就必须根据真实行为调整。它提醒你，产品策略不是写完就不变的计划，而是随着用户、市场和公司阶段不断校准的判断。"
  },
  {
    id: "classic-intercom-company-product",
    title: "The intersection of company and product strategy",
    url: "https://www.intercom.com/blog/podcasts/intercom-on-product-ep07/",
    source: "Intercom",
    topic: "公司战略和产品战略",
    story:
      "不要只从功能角度看产品，这是这篇最有用的提醒。很多产品讨论只盯着做什么功能，但功能为什么重要，取决于公司想赢在哪里。文章的核心价值在于说明产品策略不能和公司策略分开。一个功能如果不能支持公司的定位、客户选择和商业模式，就算做得很好也可能是分散注意力。"
  },
  {
    id: "classic-first-round-pmf",
    title: "Vanta's Path to Product-Market Fit",
    url: "https://review.firstround.com/vantas-path-to-product-market-fit/",
    source: "First Round Review",
    topic: "产品市场匹配",
    story:
      "产品市场匹配常被说得很抽象，这篇把它拉回一家具体公司的过程。Vanta 早期不是先写很多代码，而是先反复确认客户真正愿意为哪件麻烦事付钱。它的价值在于让你看到一个公司怎样从错误想法里转出来，逐渐找到更清楚、更痛的客户问题。"
  },
  {
    id: "classic-increment-planning",
    title: "Planning for Momentum",
    url: "https://increment.com/planning/planning-for-momentum/",
    source: "Increment",
    topic: "产品规划和工程协作",
    story:
      "产品规划不只是排期表，这期能把这件事讲清楚。好的规划要让团队知道为什么做、先做什么、哪些事情可以推迟，以及工程和产品如何对齐。它对创业阅读有帮助，因为很多公司不是死在想法不好，而是死在执行节奏混乱。看一家公司时，如果它面对复杂产品还能保持清楚的路线图和取舍，这本身就是一种能力。"
  },
  {
    id: "classic-stripe-increment",
    title: "Introducing Increment",
    url: "https://stripe.com/blog/increment",
    source: "Stripe",
    topic: "工程组织和产品质量",
    story:
      "Stripe 怎么看待工程质量和产品速度，这篇是一个很好的入口。它不是在讲某个具体功能，而是在表达一种产品和工程文化。Stripe 认为很多看似很小的工程实践，比如测试、部署、代码审查和开发工具，其实会长期影响公司做产品的速度和质量。读它时可以重点想一个问题，优秀公司为什么会认真研究这些不显眼的基础工作。"
  }
];

const MORE_EVERGREEN_READINGS = [
  ["classic-pg-default-alive", "Default Alive or Default Dead?", "https://www.paulgraham.com/aord.html", "Paul Graham", "公司生存和现金流"],
  ["classic-pg-schlep", "Schlep Blindness", "https://www.paulgraham.com/schlep.html", "Paul Graham", "被忽略的麻烦问题"],
  ["classic-pg-ambitious", "Frighteningly Ambitious Startup Ideas", "https://www.paulgraham.com/ambitious.html", "Paul Graham", "大想法和切入口"],
  ["classic-pg-growth", "Startup = Growth", "https://www.paulgraham.com/growth.html", "Paul Graham", "增长和创业定义"],
  ["classic-pg-mistakes", "The 18 Mistakes That Kill Startups", "https://www.paulgraham.com/startupmistakes.html", "Paul Graham", "创业常见错误"],
  ["classic-a16z-pmf", "The Only Thing that Matters", "https://pmarchive.com/guide_to_startups_part4.html", "Marc Andreessen", "产品市场匹配"],
  ["classic-superhuman-pmf", "How Superhuman Built an Engine to Find Product-Market Fit", "https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/", "First Round Review", "产品市场匹配和用户研究"],
  ["classic-positioning", "Obviously Awesome", "https://www.aprildunford.com/obviously-awesome", "April Dunford", "定位和产品叙事"],
  ["classic-linear-method", "The Linear Method", "https://linear.app/method", "Linear", "产品质量和团队方法"],
  ["classic-intercom-job-stories", "Designing Features Using Job Stories", "https://www.intercom.com/blog/using-job-stories-design-features-ui-ux/", "Intercom", "用户场景和产品设计"],
  ["classic-intercom-retention", "Retention is the Key to Growth", "https://www.intercom.com/blog/retention-is-the-key-to-growth/", "Intercom", "留存和 SaaS 增长"],
  ["classic-basecamp-shape-up", "Shape Up", "https://basecamp.com/shapeup", "Basecamp", "产品规划和执行"],
  ["classic-37signals-getting-real", "Getting Real", "https://basecamp.com/gettingreal", "37signals", "小团队产品方法"],
  ["classic-julie-designers", "How to Work with Designers", "https://medium.com/the-year-of-the-looking-glass/how-to-work-with-designers-6c975dede146", "Julie Zhuo", "设计协作"],
  ["classic-julie-pm", "What Makes a Great Product Manager", "https://medium.com/the-year-of-the-looking-glass/what-makes-a-great-product-manager-5d19e0960d54", "Julie Zhuo", "产品管理"],
  ["classic-reforge-growth", "Growth Models", "https://www.reforge.com/blog/growth-models", "Reforge", "增长模型"],
  ["classic-lenny-marketplaces", "How to Kickstart and Scale a Marketplace", "https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace", "Lenny's Newsletter", "市场平台"],
  ["classic-svpg-product-teams", "Product vs. Feature Teams", "https://www.svpg.com/product-vs-feature-teams/", "Silicon Valley Product Group", "产品团队和功能团队"],
  ["classic-svpg-discovery", "Product Discovery", "https://www.svpg.com/product-discovery/", "Silicon Valley Product Group", "产品发现"],
  ["classic-nng-heuristics", "10 Usability Heuristics for User Interface Design", "https://www.nngroup.com/articles/ten-usability-heuristics/", "Nielsen Norman Group", "可用性和界面设计"],
  ["classic-nng-service-blueprint", "Service Blueprints: Definition", "https://www.nngroup.com/articles/service-blueprints-definition/", "Nielsen Norman Group", "服务设计和流程"]
].map(([id, title, url, source, topic]) => ({
  id,
  title,
  url,
  source,
  topic,
  story: evergreenStory({ title, source, topic })
}));

EVERGREEN_READINGS.push(...MORE_EVERGREEN_READINGS);

const ADDITIONAL_EVERGREEN_READINGS = [
  ["classic-intercom-onboarding", "The ultimate guide to onboarding", "https://www.intercom.com/blog/user-onboarding/", "Intercom", "新用户体验和激活"],
  ["classic-intercom-prioritization", "RICE: Simple prioritization for product managers", "https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/", "Intercom", "产品优先级"],
  ["classic-reforge-retention", "Retention + Engagement", "https://www.reforge.com/blog/retention-engagement", "Reforge", "留存和参与度"],
  ["classic-reforge-product-strategy", "The Product Strategy Stack", "https://www.reforge.com/blog/product-strategy-stack", "Reforge", "产品策略"],
  ["classic-svpg-outcomes", "Outcomes vs. Outputs", "https://www.svpg.com/outcomes-over-output/", "Silicon Valley Product Group", "产品结果和产出"],
  ["classic-nng-journey-mapping", "Journey Mapping 101", "https://www.nngroup.com/articles/journey-mapping-101/", "Nielsen Norman Group", "用户旅程和服务设计"],
  ["classic-nng-ux-research", "When to Use Which User-Experience Research Methods", "https://www.nngroup.com/articles/which-ux-research-methods/", "Nielsen Norman Group", "用户研究方法"],
  ["classic-elad-scaling", "High Growth Handbook", "https://growth.eladgil.com/", "Elad Gil", "公司扩张"],
  ["classic-andy-grove-high-output", "High Output Management", "https://www.goodreads.com/book/show/324750.High_Output_Management", "Andy Grove", "管理和组织"],
  ["classic-basecamp-calm", "Shape Up: Betting", "https://basecamp.com/shapeup/1.1-chapter-02", "Basecamp", "产品下注和规划"],
  ["classic-julie-feedback", "Giving Design Feedback", "https://medium.com/the-year-of-the-looking-glass/giving-design-feedback-91e9f528f5ba", "Julie Zhuo", "设计反馈"],
  ["classic-balfour-channels", "Traction vs. Growth", "https://brianbalfour.com/essays/traction-vs-growth", "Brian Balfour", "增长阶段"],
  ["classic-figma-community", "How Figma builds product", "https://www.lennysnewsletter.com/p/how-figma-builds-product", "Lenny's Newsletter", "设计工具和产品组织"],
  ["classic-openview-plg", "What is Product-Led Growth?", "https://openviewpartners.com/blog/what-is-product-led-growth/", "OpenView", "产品驱动增长"],
  ["classic-pg-fr", "Founder Mode", "https://paulgraham.com/foundermode.html", "Paul Graham", "创始人和管理"],
  ["classic-pg-ramen", "Ramen Profitable", "https://paulgraham.com/ramenprofitable.html", "Paul Graham", "早期公司生存"],
  ["classic-pg-organic", "Organic Startup Ideas", "https://paulgraham.com/organic.html", "Paul Graham", "创业想法"],
  ["classic-pg-scale", "Do Things that Don't Scale", "https://www.paulgraham.com/ds.html", "Paul Graham", "早期用户"],
  ["classic-pg-users", "What I've Learned from Users", "https://paulgraham.com/users.html", "Paul Graham", "用户理解"],
  ["classic-nng-ux-debt", "UX Debt", "https://www.nngroup.com/articles/ux-debt/", "Nielsen Norman Group", "产品体验债务"],
  ["classic-nng-personas", "Personas Make Users Memorable for Product Team Members", "https://www.nngroup.com/articles/persona/", "Nielsen Norman Group", "用户理解和产品团队"],
  ["classic-nng-ab-testing", "A/B Testing, Usability Engineering, Radical Innovation", "https://www.nngroup.com/articles/ab-testing-usability-engineering-radical-innovation/", "Nielsen Norman Group", "实验和设计判断"],
  ["classic-intercom-jobs", "Jobs-to-be-Done", "https://www.intercom.com/blog/jobs-to-be-done/", "Intercom", "用户任务和产品定位"],
  ["classic-intercom-retention-growth", "How to Improve User Retention", "https://www.intercom.com/blog/improve-user-retention/", "Intercom", "留存和增长"]
].map(([id, title, url, source, topic]) => ({
  id,
  title,
  url,
  source,
  topic,
  story: evergreenStory({ title, source, topic })
}));

EVERGREEN_READINGS.push(...ADDITIONAL_EVERGREEN_READINGS);

const EXPANDED_SOURCE_READINGS = [
  ["classic-yc-start-startup", "How to Start a Startup", "https://www.ycombinator.com/library/4D-how-to-start-a-startup", "Y Combinator", "创业起步"],
  ["classic-yc-talk-users", "How to Talk to Users", "https://www.ycombinator.com/library/6g-how-to-talk-to-users", "Y Combinator", "用户访谈"],
  ["classic-yc-build-users-want", "Build Something People Want", "https://www.ycombinator.com/library/4i-build-something-people-want", "Y Combinator", "产品需求"],
  ["classic-a16z-ai-business", "The New Business of AI", "https://a16z.com/the-new-business-of-ai-and-how-its-different-from-traditional-software/", "a16z", "人工智能产品和商业模式"],
  ["classic-a16z-marketplace", "The Marketplace 100", "https://a16z.com/marketplace-100/", "a16z", "市场平台"],
  ["classic-anthropic-agents", "Building Effective Agents", "https://www.anthropic.com/engineering/building-effective-agents", "Anthropic", "智能体产品设计"],
  ["classic-openai-gpts", "Introducing GPTs", "https://openai.com/index/introducing-gpts/", "OpenAI", "平台产品和生态"],
  ["classic-posthog-product-engineering", "What is Product Engineering?", "https://posthog.com/blog/product-engineering", "PostHog", "产品工程"],
  ["classic-posthog-pmf", "Product-Market Fit", "https://posthog.com/blog/what-is-product-market-fit", "PostHog", "产品市场匹配"],
  ["classic-amplitude-north-star", "What is a North Star Metric?", "https://amplitude.com/blog/north-star-metric", "Amplitude", "产品指标"],
  ["classic-amplitude-retention", "Retention Analysis", "https://amplitude.com/blog/retention-analysis", "Amplitude", "留存分析"],
  ["classic-mixpanel-pirate", "AARRR Pirate Metrics", "https://mixpanel.com/blog/aarrr-pirate-metrics/", "Mixpanel", "增长指标"],
  ["classic-atlassian-roadmaps", "Product Roadmaps", "https://www.atlassian.com/agile/product-management/product-roadmaps", "Atlassian", "产品路线图"],
  ["classic-maze-usability", "Usability Testing", "https://maze.co/guides/usability-testing/", "Maze", "可用性测试"],
  ["classic-productboard-prioritization", "Feature Prioritization", "https://www.productboard.com/blog/feature-prioritization/", "Productboard", "功能优先级"],
  ["classic-miro-design-thinking", "Design Thinking", "https://miro.com/blog/design-thinking/", "Miro", "设计思维"],
  ["classic-miro-user-journey", "User Journey Map", "https://miro.com/blog/user-journey-map/", "Miro", "用户旅程"],
  ["classic-shopify-product", "How Shopify Builds Product", "https://www.shopify.com/blog/product-development", "Shopify", "产品开发"],
  ["classic-github-platform", "GitHub's Engineering System", "https://github.blog/engineering/engineering-principles/", "GitHub", "工程原则"],
  ["classic-stripe-apis", "APIs as Infrastructure", "https://stripe.com/blog/apis-as-infrastructure", "Stripe", "平台和接口设计"],
  ["classic-linear-quality", "Quality is a System Property", "https://linear.app/blog/quality-is-a-system-property", "Linear", "产品质量"],
  ["classic-linear-craft", "Crafting a Quality Experience", "https://linear.app/blog/crafting-a-quality-experience", "Linear", "产品体验"],
  ["classic-figma-design-systems", "Design Systems", "https://www.figma.com/blog/design-systems-101/", "Figma", "设计系统"],
  ["classic-figma-config", "Config", "https://www.figma.com/blog/config-2024-recap/", "Figma", "设计工具和产品发布"],
  ["classic-notion-scaling", "How Notion Grows", "https://www.lennysnewsletter.com/p/how-notion-grows", "Lenny's Newsletter", "产品增长案例"],
  ["classic-slack-growth", "Slack's Product-Market Fit", "https://review.firstround.com/slacks-2-8-billion-dollar-secret-sauce/", "First Round Review", "协作产品增长"],
  ["classic-airbnb-trust", "Designing for Trust", "https://airbnb.design/designing-for-trust/", "Airbnb Design", "信任和产品设计"],
  ["classic-airbnb-language", "Building a Visual Language", "https://airbnb.design/building-a-visual-language/", "Airbnb Design", "品牌和设计系统"],
  ["classic-govuk-service", "Service Manual", "https://www.gov.uk/service-manual", "GOV.UK", "服务设计"],
  ["classic-material-design", "Material Design", "https://m3.material.io/", "Google Design", "界面设计系统"],
  ["classic-apple-hig", "Human Interface Guidelines", "https://developer.apple.com/design/human-interface-guidelines/", "Apple Design", "界面和平台设计"]
].map(([id, title, url, source, topic]) => ({
  id,
  title,
  url,
  source,
  topic,
  story: evergreenStory({ title, source, topic })
}));

EVERGREEN_READINGS.push(...EXPANDED_SOURCE_READINGS);

async function fetchText(url, maxTime = "25") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(maxTime) * 1000);

  try {
    const response = await fetch(url, {
      headers: { "user-agent": "startup-radar-prototype/0.1" },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(url, maxTime) {
  return JSON.parse(await fetchText(url, maxTime));
}

async function readRss(url) {
  const xml = await fetchText(url);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text"
  });
  return parser.parse(xml);
}

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(values) {
  return values.filter((value) => typeof value === "string" && value.trim().length > 0);
}

export function companyDedupeKeys(company) {
  return compact([
    company.id,
    company.id ? `yc-${String(company.id).replace(/^yc-/, "")}` : "",
    normalizedTextKey(company.name),
    normalizedUrlKey(company.url || company.website || company.sourceUrl || "")
  ]);
}

export function readingDedupeKey(reading) {
  return normalizedUrlKey(reading.url || "") || normalizedTextKey(reading.title || "");
}

export function readingSourceKey(reading) {
  return normalizedTextKey(reading.source || "");
}

function readingThemeKey(reading) {
  const text = `${reading.title || ""} ${reading.source || ""} ${reading.topic || ""} ${reading.url || ""}`.toLowerCase();
  if (text.includes("figma")) return "figma";
  if (text.includes("design system") || text.includes("visual language") || text.includes("ui ") || text.includes("ux ") || text.includes("interface")) return "design";
  if (text.includes("growth") || text.includes("retention") || text.includes("north star") || text.includes("aarrr")) return "growth";
  if (text.includes("product-market fit") || text.includes("pmf")) return "product-market-fit";
  if (text.includes("strategy") || text.includes("roadmap") || text.includes("prioritization") || text.includes("saying no")) return "product-strategy";
  if (text.includes("startup") || text.includes("founder") || text.includes("ramen profitable") || text.includes("default alive")) return "startup-building";
  if (text.includes("engineering") || text.includes("api") || text.includes("infrastructure") || text.includes("quality")) return "engineering";
  if (text.includes("marketplace")) return "marketplace";
  if (text.includes("ai") || text.includes("agent") || text.includes("model")) return "ai";
  return normalizedTextKey(reading.topic || reading.title || "");
}

export function isBlockedReading(reading) {
  const key = readingDedupeKey(reading);
  return Boolean((key && BLOCKED_READING_KEYS.has(key)) || isBlockedReadingDomain(reading.url) || isCollectionReadingUrl(reading.url));
}

function isBlockedReadingDomain(value = "") {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return BLOCKED_READING_DOMAINS.has(host);
  } catch {
    return false;
  }
}

function isCollectionReadingUrl(value = "") {
  try {
    const url = new URL(value);
    const pathname = url.pathname.toLowerCase();
    return pathname.includes("/series/") || pathname.includes("/collections/") || pathname.includes("/topics/");
  } catch {
    return false;
  }
}

function normalizedTextKey(value = "") {
  return cleanText(value).toLowerCase();
}

function normalizedUrlKey(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref|source|fbclid|gclid|mc_|igshid)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }

    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = url.pathname.replace(/\/$/, "").toLowerCase();
    const search = url.searchParams.toString();
    return `${host}${pathname}${search ? `?${search}` : ""}`;
  } catch {
    return "";
  }
}

const BLOCKED_READING_KEYS = new Set(
  [
    "https://www.lennysnewsletter.com/p/what-is-good-retention",
    "https://linear.app/blog/quality-is-a-system-property",
    "https://stripe.com/blog/apis-as-infrastructure",
    "https://airbnb.design/designing-for-trust/",
    "https://airbnb.design/building-a-visual-language/",
    "https://www.lennysnewsletter.com/p/how-to-price-your-product",
    "https://review.firstround.com/how-to-kickstart-and-scale-a-marketplace-business/",
    "https://review.firstround.com/your-products-first-90-days/",
    "https://linear.app/blog/crafting-interactions-that-feel-magical",
    "https://www.lennysnewsletter.com/p/how-the-biggest-b2b-businesses",
    "https://basecamp.com/gettingreal/04.1-build-less",
    "https://review.firstround.com/the-minimum-viable-sales-process/",
    "https://brianbalfour.com/essays/growth-models",
    "https://review.firstround.com/stripe-patrick-collison-on-strategy-and-company-building/",
    "https://brianbalfour.com/essays/scientific-method-growth-experiments",
    "https://www.aprildunford.com/post/positioning-manifesto",
    "https://www.svpg.com/product-discovery-overview/",
    "https://linear.app/blog/the-growing-pains-of-high-growth-startups",
    "https://a16z.com/network-effects/",
    "https://review.firstround.com/slacks-2-8-billion-dollar-secret-sauce/",
    "https://a16z.com/16-metrics/",
    "https://www.lennysnewsletter.com/p/how-notion-grows",
    "https://www.intercom.com/blog/retention-is-the-key-to-growth/",
    "https://www.atlassian.com/agile/product-management/product-discovery",
    "https://maze.co/blog/product-discovery/",
    "https://www.productboard.com/blog/product-discovery/"
  ].map((url) => normalizedUrlKey(url))
);

const BLOCKED_READING_DOMAINS = new Set(["medium.com"]);

function hasAnyKey(seenKeys, keys) {
  return keys.some((key) => seenKeys.has(key));
}

function northAmericaScore(company) {
  const location = `${company.all_locations ?? ""} ${company.regions?.join(" ") ?? ""}`.toLowerCase();
  if (location.includes("san francisco") || location.includes("new york") || location.includes("canada")) return 3;
  if (location.includes("united states") || location.includes("usa") || location.includes("remote")) return 2;
  if (location.includes("north america")) return 1;
  return 0;
}

function batchScore(batch = "") {
  const match = String(batch).match(/20\d{2}/);
  return match ? Number(match[0]) : 0;
}

function companyReason(company) {
  const signals = [];
  if (company.batch) signals.push(`YC ${translateBatch(company.batch)} 批次公司`);
  if (company.top_company) signals.push("YC 标记为 Top Company");
  if (company.isHiring) signals.push("正在招聘");
  if (company.team_size && company.team_size >= 10) signals.push(`团队约 ${company.team_size} 人`);
  if (company.website) signals.push("有官网");
  if (company.url) signals.push("有 YC 公司页");
  return signals.slice(0, 4);
}

function translateBatch(batch = "") {
  return String(batch)
    .replace("Winter", "冬季")
    .replace("Spring", "春季")
    .replace("Summer", "夏季")
    .replace("Fall", "秋季");
}

function companyStory(company) {
  const override = companyStoryOverrides[company.slug];
  if (override) return override(company);

  const one = cleanText(company.one_liner || company.long_description || "这家公司还没有足够清楚的一句话介绍");
  const long = cleanText(company.long_description || one);
  const chineseProduct = explainCompanyInChinese(company, one, long);
  const scenario = storyScenario(company, chineseProduct);

  return `${scenario} ${attentionSentence(company)}`;
}

const companyStoryOverrides = {
  corelayer: (company) =>
    `想象你负责一家金融或医疗公司的线上系统，半夜告警响了，问题可能来自日志、数据库、基础设施，也可能只是某个数据状态不对。工程师最耗时间的地方，是把线索从一堆监控和系统里捞出来。Corelayer 想做一个人工智能值班工程师，持续看告警、日志和底层数据，先帮团队定位问题、解释原因、建议修复方向。它值得看，是因为受监管行业的软件支持既要求速度，也要求可追溯，单纯聊天机器人很难满足。`,

  replicas: (company) =>
    `如果你在工程团队里同时积着很多小任务，最烦的是每个任务都要有人开环境、跑代码、等测试、修持续集成。Replicas 想把 Claude Code 或 Codex 这类代码智能体放到云端沙盒里，从 Slack、Linear、GitHub 直接派活，让多个任务并行跑起来。它还会把失败的测试和代码评审反馈再喂回任务里。它值得看，是因为代码智能体真要进入团队工作流，运行环境、反馈循环和预览链接会比单次生成代码更重要。`,

  "toothy-ai": (company) =>
    `假如你经营一家牙科诊所，前台每个月要花大量时间确认病人保险、打电话给保险公司、处理账单和理赔。病人只是来洗牙或补牙，背后却有一整套慢而麻烦的保险流程。Toothy AI 想用语音和后台智能体接管这些保险相关工作，让诊所更快确认覆盖范围、更快收款，也少把员工时间耗在电话里。它值得看，是因为牙科诊所的保险流程很具体、很重复，而且直接影响现金回款。`,

  celltype: (company) =>
    `想象你在药物研发团队里，真正昂贵的不是提出一个假设，而是一路做实验、筛选靶点、验证信号，最后才知道方向对不对。CellType 想把智能体放到药物发现流程里，基于模拟人体生物学的基础模型去寻找和验证治疗信号。它不是普通诊所软件，而是更接近“用智能体跑药物研发流程”的公司。它值得看，是因为公开资料里提到与 Google DeepMind 相关的核心技术，并且已经发现和验证了一个癌症治疗信号。`,

  playgent: (company) =>
    `假如你负责把智能体接进公司系统，最怕的不是它偶尔答错一句话，而是它在真实环境里失败后，你根本复现不了当时发生了什么。用户状态、数据、工具调用和上下文都变了，工程团队只能猜。Playgent 想给智能体创建高保真的沙盒环境，把生产里的失败条件安全地重建出来，让团队能调试、追踪并接进现有观测工具。它值得看，是因为智能体要进企业生产环境，测试和复现能力会先变成基础设施问题。`,

  libretto: (company) =>
    `如果你让智能体去操作一个复杂网站，它可能要一边看页面一边点击，速度慢、成本高，还容易被页面变化弄坏。Libretto 的思路不是让智能体每次都实时乱点，而是把网站流程变成可以复用、可以读、可以调试的脚本。这样同一个登录、查询、提交或导出流程，下次就不必重新让智能体摸索。它值得留意，是因为很多公司想用智能体处理网页工作流，但真正难的是让这些流程稳定、便宜、可维护。`,

  "perspectives-health": (company) =>
    `如果你在心理健康或成瘾治疗诊所工作，很多时间并不花在面对病人，而是花在文档、合规、审计和保险审核上。治疗师和运营人员要把每次服务写清楚，证明护理必要性，还要应付各种审查。Perspectives Health 想用一组人工智能助手，把这些后台行政任务自动化掉，让诊所把更多时间留给病人。它值得看，是因为行为健康服务需求很高，但诊所的人力和行政负担长期很重。`,

  "bucket-robotics": (company) =>
    `假如你在工厂负责质检，每天要判断零件有没有划痕、变形、装错或漏装。人工检查很累，传统视觉系统又常常要拍很多真实缺陷照片、慢慢标注、反复调规则，一换零件就要重新折腾。Bucket Robotics 想用工厂本来就有的 CAD 文件和少量样品数据，生成能在现有摄像头和边缘设备上运行的视觉检测模型。它值得放进列表，不是因为名字里有 Robotics，而是因为制造业正在花大量钱做自动化，但质量检测仍然是很难被放心交给机器的一环。`,

  "revise-robotics": (company) =>
    `想象你在一家电子垃圾回收和翻新工厂，传送带上来了几百台旧笔记本。每台电脑都要判断型号、测试能不能开机、清除硬盘、拍照、定价，再放到二手平台上卖。Revise Robotics 想用一套带人工智能的机器人系统，把这些步骤尽量自动做完，让工厂不用靠人大量翻看和处理旧设备。它值得留意，是因为消费电子翻新背后有很大的二手市场，也有减少电子垃圾的现实需求。`,

  flai: (company) =>
    `假如你经营一家汽车经销商，很多潜在客户会在晚上或周末打电话，想约试驾、问库存、预约保养，或者处理召回。店里没人接电话时，这些客户很容易转头找另一家。Flai 想用语音人工智能助手全天接听电话，帮经销商安排试驾、预约换油、跟进召回活动，让销售机会不要因为没人在线而丢掉。它值得看，是因为汽车经销商的线索很贵，而“及时接住客户”这件事直接关系到收入。`,

  cyberdesk: (company) =>
    `想象你在医院前台，每天都要打开预约系统、病历系统和保险系统，把同一类信息来回复制。新人学这些步骤要很久，老员工也会被重复操作拖住。Cyberdesk 想做一个会学桌面操作的智能体，像熟练同事一样记住流程，遇到弹窗或界面变化也能调整。它的竞争力不在于会聊天，而在于能不能真的进入这些没有接口、只能靠人点击的老系统。YC 夏季 2025 批次这个背景，让它值得先看一眼。`,

  robby: (company) =>
    `假如你经营一家暖通维修公司，技师每天上门修设备，但他可能不知道这个家庭还有旧空调、过期保修或马上要换的配件。Robby 会提前把客户数据和外部线索整理出来，再告诉技师现场可以怎么聊。它不是只帮你记录客户，而是试图让每一次上门服务都多一点发现新收入的机会。公开资料里已经提到付费客户和新增收入机会，再加上它来自 YC 冬季 2026 批次，所以这类接地气的增长工具值得放进今天的列表。`,

  "ondeck-ai": (company) =>
    `设想你管理一个仓库，摄像头每天录下大量画面，出问题时你想找“哪一辆叉车在某个时间段经过了这里”，传统办法常常是人工回看或重新训练模型。OnDeck AI 想让企业直接搜索视频里的对象和事件，不必每次都从头训练一套系统。它的看点在于，如果视觉模型真的能泛化到很多企业场景，视频就会从沉睡资料变成可查询的数据。它来自 YC 夏季 2025 批次，也赶上了企业视频越来越多、真正可用分析工具仍然稀缺的时点。`,

  "ruma-care": (company) =>
    `如果你在诊所负责运营，一个病人来做输注治疗，背后不只是安排时间，还要确认保险预授权、处理拒付、协调药品库存和账单。任何一步慢了，病人可能等不到药，诊所也可能收不到钱。Ruma Care 从这些后台流程切入，想把纸张、表格和电话追踪变成一套更清楚的运营系统。它来自 YC 冬季 2026 批次，选择的是生物制剂输注诊所这个很窄、但费用高、流程重的医疗场景。`,

  voltair: (company) =>
    `假如你在电力公司负责一大片线路，暴风雨过后要尽快知道哪根杆塔、哪段电线出了问题，但派人一处处看很慢也有危险。Voltair 想在电线杆附近部署充电点，让无人机自己反复巡检大片区域。它不是做普通航拍，而是想把电网变成无人机可以长期工作的基础设施。电网巡检既老、又贵、还越来越紧迫，所以这家 YC 冬季 2026 批次的自主无人机公司值得留意。`,

  klaimee: (company) =>
    `假如你是公司法务，业务团队想让智能体自动发邮件、改数据、下订单，你不会只问它准不准，还会问它万一搞错了谁负责。传统网络保险和职业责任保险未必覆盖这种新风险。Klaimee 想做智能体的责任保险和风险认证，给企业一个更容易签字放行的答案。它来自 YC 春季 2026 批次，抓住的是企业很快会认真问的人工智能责任问题。`,

  kita: (company) =>
    `假如你在一家贷款机构工作，申请人的收入和还款能力不一定整齐地躺在银行接口里，而是散在电子钱包记录、银行流水、账单和各种文件中。人工一份份看很慢，也容易漏掉欺诈信号。Kita 想用人工智能把这些杂乱材料读出来，帮机构更快判断能不能放款。它是 YC 冬季 2026 批次的金融基础设施公司，处理的是新兴市场里贷款审核最麻烦的一段。`,

  "one-robot": (company) =>
    `想象你在做一个会折衣服或折盒子的机器人，每改一次模型，都要重新摆场景、跑测试、复位，再记录失败原因。这个过程又慢又贵。One Robot 做的是更接近真实交互的仿真环境，让团队先在模拟世界里大量训练和评估，再把更有希望的版本拿到真实机器人上试。它来自 YC 冬季 2026 批次，看点在于帮机器人团队省掉大量真实测试的时间。`,

  "origami-robotics": (company) =>
    `如果你想让机器人在真实世界里帮忙，它不能只会移动，还要会抓杯子、拿工具、折东西、摆放形状不同的物体。人觉得顺手的动作，对机器人来说很难。Origami Robotics 想做能操作更多物体的模型和配套机器人手，并用专门设备收集真实操作数据。它的竞争力取决于能不能把灵巧操作从演示变成稳定能力。它来自 YC 冬季 2026 批次，切的是机器人最难也最关键的部分之一，也就是“手”。`,

  "alt-x": (company) =>
    `假如你持有一家未上市公司的股份，想提前卖掉一部分，事情不会像卖股票那样点一下就结束。你要找买家、做尽调、估值、处理文件，还要靠经纪人和表格来回撮合。Alt-X 想用人工智能自动化这些步骤，先从创业公司二级份额做起。它不是发明新资产，而是给一个巨大但低效的市场补交易基础设施。它是 YC 冬季 2026 批次的金融工具公司，值得看是因为私募市场里有很多想交易、但很难高效交易的资产。`,

  rote: (company) =>
    `它进入了 YC 冬季 2027 批次，而且切入的是一个很具体的赔付问题。保险和汽修之间有很多靠人工争取的钱，正在适合被 AI agent 接管。汽修店和保险公司之间，经常有一笔钱卡在中间。车修好了以后，保险公司可能觉得某些维修不该赔，或者价格太高。Rote 就像店里的保险谈判助手，会根据维修估价和技术资料整理理由，帮店主把原本可能被放弃的钱追回来。`,

  cerenovus: (company) =>
    `企业内部知识管理正在被 AI agent 重新做一遍，Cerenovus 的特别之处是把切口放在管理决策上，而不只是文档搜索。公司越大，信息越容易散在各个角落。项目为什么延期，团队为什么交接不顺，答案往往藏在邮件、文档、Slack 和会议记录里。Cerenovus 想把这些资料连成一张公司知识图，让领导更快看清协作卡在哪里。`,

  "river-markets": (company) =>
    `预测市场正在从小众社区玩法变成专业交易者也会认真看的市场，River Markets 押的是这个市场变大以后需要专业基础设施。所谓预测市场，就是人们用真钱交易某个事件发生的概率，比如选举结果、利率变化或商业事件。问题是交易场所分散，价格和仓位也不好统一管理。River Markets 像一个统一交易台，把多个预测市场接到同一个账户里。`,

  "the-company-company": (company) =>
    `AI agent 正在从工具变成公司流程的一部分，The Company Company 的目标说得很大，想做参与公司运转的基础设施。很多公司都有一堆没人想做、但每天都要做的运营工作，比如更新表格、提醒负责人、同步系统和跟进任务。它想让 AI 不只是回答问题，而是把这些工作交给能连接公司工具的 agent。公开信息还很少，所以要看它能不能真的完成可验证的工作。`,

  "bloom-3": (company) =>
    `超过 100 万用户和已经披露的年经常性收入，让 Bloom 比普通消费金融概念更有验证基础。年轻用户需要的不只是交易入口，也需要能把投资讲明白的产品。很多人想开始投资，但第一步往往卡在“不知道该怎么学”。Bloom 不是只做一个买股票 App，而是把投资教育和真实账户放在一起。`,

  trybloom: (company) =>
    `AI 生成内容正在进入市场和设计团队，品牌一致性会变成新问题。Bloom 押的是企业会需要一个品牌控制层。一家公司可能用不同 AI 工具做海报、短视频、网页和文案，结果颜色、语气和字体都不太一样。Bloom 想把公司的 deck、网站、社交内容和 Figma 资料读进来，变成 AI 可以调用的品牌规则层。`,

  "eden-robotics": (company) =>
    `机器人创业正在从“卖机器”转向“卖可用劳动力”。Eden Robotics 的看点不只是机器人本身，也包括按使用付费的商业模式。很多企业想试机器人，但买设备、维护和调试的成本很高。它让客户不用一次性买机器，可以像使用外包服务一样按量付费。这个模式会降低尝试门槛，但关键仍然是现场表现。`,

  "tasklet-2": (company) =>
    `AI agent 正在从“回答问题”走向“接管工作”，Tasklet 正好押在这个方向上。很多办公室工作都散在 CRM、邮箱、表格和内部系统里。人们每天要拉报表、更新客户状态、处理重复请求。普通聊天机器人只能告诉你怎么做，Tasklet 想直接替你做。它会连接工具、调用 API、打开网页甚至跑代码。`,

  runtime: (company) =>
    `Coding agent 在企业里真正铺开之前，安全和管理会先变成刚需。越来越多公司想用 coding agent，但工程负责人会担心失控。如果产品经理、设计师或运营也开始让 AI 改代码，公司就必须知道它改了什么，会不会碰生产环境，权限怎么管。Runtime 提供沙盒环境、执行记录和安全边界，让公司更放心地让 AI 或非工程人员参与开发。`,

  kinro: (company) =>
    `公开资料里已经提到收入、州牌照和保险公司合作，这些比单纯概念更硬。小企业保险分销很适合被自动化重做。小企业保费不高，但经纪人服务它们也要花不少时间，所以传统经纪人并不总愿意认真做。Kinro 想用智能体自动完成保险经纪流程，从找客户到绑定保单都尽量自动化。`,

  hub: (company) =>
    `前沿 AI 和机器人公司越来越缺真实世界数据，而这类数据很难只靠公开网页补齐。公开网页上的数据不够训练模型理解真实的人怎么说话、怎么做事、怎么表达细微情绪。Hub 通过覆盖很多国家的人群网络收集语音、场景和多模态数据，再经过人工验证后交给 AI 实验室或大公司。`
};

function describeIndustry(company) {
  const text = `${company.industry ?? ""} ${company.subindustry ?? ""} ${company.tags?.join(" ") ?? ""}`.toLowerCase();

  if (text.includes("health") || text.includes("bio") || text.includes("medical")) return "医疗健康相关工具";
  if (text.includes("fintech") || text.includes("finance") || text.includes("banking")) return "金融或支付相关工具";
  if (isHardwareText(text)) return "智能硬件或可穿戴设备";
  if (text.includes("robot") || text.includes("manufacturing") || text.includes("industrial")) return "制造业或机器人相关工具";
  if (text.includes("developer") || text.includes("infrastructure") || text.includes("devtools")) return "开发者工具或技术基础设施";
  if (text.includes("ai") || text.includes("artificial intelligence")) return "人工智能应用";
  if (text.includes("sales") || text.includes("marketing")) return "销售和市场团队使用的软件";
  if (text.includes("recruit") || text.includes("talent") || text.includes("hr")) return "招聘和人力资源工具";
  if (text.includes("education")) return "教育相关产品";
  if (text.includes("climate") || text.includes("energy")) return "气候或能源相关产品";
  if (text.includes("consumer")) return "面向普通消费者的产品";
  if (text.includes("b2b") || text.includes("saas")) return "企业软件";
  return "某个垂直领域工具";
}

function explainCompanyInChinese(company, one, long) {
  const text = `${one} ${long}`.toLowerCase();

  if (isHardwareText(text)) {
    return "把人工智能能力放进一个可以随身使用的设备里，让录音、提醒、健康记录或日常信息不只停留在手机应用里";
  }
  if (/\bsandbox(ed|es)?\b/.test(text) || text.includes("production failures") || /\botel\b/.test(text) || text.includes("observability")) {
    return "帮工程团队复现智能体在生产环境里的失败，并把调试记录接进观测工具";
  }
  if (text.includes("website workflows") || text.includes("browser automation") || text.includes("playwright") || text.includes("reusable scripts")) {
    return "把复杂网站操作变成可靠、可复用、可调试的脚本";
  }
  if (text.includes("behavioral health") || text.includes("mental health") || text.includes("utilization review") || text.includes("audits")) {
    return "帮行为健康诊所减少文档、合规、审计和保险审核这类后台行政工作";
  }
  if (text.includes("defect") || text.includes("inspection") || text.includes("quality inspection") || text.includes("quality control") || text.includes("manufacturing quality")) {
    return "把工厂质检从人工看、手写规则和慢慢标注，变成更快部署的视觉检测流程";
  }
  if (text.includes("refurbish") || text.includes("e-waste") || text.includes("discarded electronics") || text.includes("second-hand")) {
    return "把旧电子设备的测试、清除数据、拍照和转售流程自动化";
  }
  if (text.includes("dealership") || text.includes("test drive") || text.includes("oil change") || text.includes("recall")) {
    return "帮汽车经销商接住电话线索、安排试驾和服务预约";
  }
  if (text.includes("agent") || text.includes("automation") || text.includes("workflow")) {
    return "把原本需要人一步步处理的流程交给软件先整理、提醒或自动完成，让人只处理最重要的部分";
  }
  if (text.includes("marketplace") || text.includes("platform")) {
    return "把两边原本很难找到彼此的人连接起来，比如买家和卖家、公司和服务商、需求方和供给方";
  }
  if (text.includes("data") || text.includes("analytics") || text.includes("intelligence")) {
    return "把分散的数据收集起来，整理成普通人能看懂、能拿来做决定的信息";
  }
  if (text.includes("api") || text.includes("infrastructure") || text.includes("developer")) {
    return "给工程团队提供底层工具，让他们不用从零搭建复杂系统，可以更快把产品做出来";
  }
  if (text.includes("hr") || text.includes("payroll") || text.includes("compliance")) {
    return "帮公司处理人力、工资、合规这类麻烦但必须准确完成的后台工作";
  }
  if (text.includes("sales") || text.includes("customer") || text.includes("support")) {
    return "帮公司更好地找到客户、服务客户，或者减少客服和销售团队的重复劳动";
  }
  if (text.includes("robot") || text.includes("manufacturing")) {
    return "把现实世界里的生产、搬运、检测或操作任务做得更自动化、更稳定";
  }
  if (text.includes("health") || text.includes("clinical") || text.includes("patient")) {
    return "帮医疗机构、医生或病人处理信息、跟进和运营流程，让医疗服务少一点混乱";
  }

  return "它把一个原来靠人工、表格、邮件或零散系统完成的事情，做成一个更集中的软件产品";
}

function attentionSentence(company) {
  const isYc = (company.source || []).includes("Y Combinator") || String(company.id || "").startsWith("yc-");
  const batch = company.batch ? `YC ${translateBatch(company.batch)} 批次` : "YC 公开公司库";
  const publicSource = (company.source || []).filter((source) => source !== "Y Combinator")[0] || "公开来源";
  const signals = [];
  if (company.top_company) signals.push("被 YC 标记为 Top Company");
  if (company.isHiring) signals.push("还在招聘");
  if (company.team_size && company.team_size >= 10) signals.push(`团队已经到 ${company.team_size} 人左右`);
  if (company.website) signals.push("官网信息相对完整");

  if (!isYc) {
    const variants = [
      () => `它被放进今天的列表，是因为它出现在 ${publicSource} 这类公开来源里，至少说明有人正在把这个产品推到市场面前。`,
      () => `这里没有 YC 批次或团队人数这类整齐字段，所以更应该看产品本身和来源信号；今天的信号主要来自 ${publicSource}。`,
      () => `它值得先记下来，不是因为有漂亮标签，而是因为 ${publicSource} 让我们能看到一个正在公开发布或被讨论的新产品。`,
      () => `这类非 YC 来源的信息不会总是完整，但 ${publicSource} 提供了一个入口，可以继续看官网、用户反应和后续更新。`
    ];
    return pickForCompany(company, variants)();
  }

  const variants = [
    () => `${batch} 这个背景让它值得先记录下来，后面更应该看的是客户案例和产品落地。`,
    () => `把它放进今天的列表，主要是因为它出现在${batch}，而且${signals[0] || "有公开官网和 YC 公司页可以继续追踪"}。`,
    () => `它现在还不能只凭介绍就下结论，但${batch}加上${signals[0] || "公开资料可查"}，足够作为一个后续观察点。`,
    () => `值得留意的不是标签本身，而是它能不能把这个具体流程真的跑顺；${batch}和${signals[0] || "公开公司页"}只是第一层信号。`
  ];

  return pickForCompany(company, variants)();
}

function storyScenario(company, chineseProduct) {
  const text = `${company.industry ?? ""} ${company.subindustry ?? ""} ${company.tags?.join(" ") ?? ""} ${company.one_liner ?? ""} ${company.long_description ?? ""}`.toLowerCase();

  if (isHardwareText(text)) {
    return pickForCompany(company, [
      `如果你每天开很多会、通勤、运动或到处见人，很多重要信息其实发生在电脑屏幕外。手机应用要你主动打开，但${company.name} 想${normalizeAction(chineseProduct)}。`,
      `智能硬件的机会在于它跟着人走，而不是等人坐到电脑前。想象你在会议、路上或健身时，手边没有时间整理信息，${company.name} 想把这部分体验做进设备里。`,
      `对普通用户来说，人工智能如果只藏在聊天框里，很多生活场景还是用不上。${company.name} 选择做硬件，是想让设备自己收集信号、提醒用户或记录当下。`
    ]);
  }
  if (/\bsandbox(ed|es)?\b/.test(text) || text.includes("production failures") || /\botel\b/.test(text) || text.includes("observability")) {
    return pickForCompany(company, [
      `如果你负责把智能体上线到真实业务里，最难受的是出错以后复现不了现场。用户状态、数据和工具调用都变了，团队只能猜问题在哪里。${company.name} 想${normalizeAction(chineseProduct)}。`,
      `企业里的智能体一旦在生产环境里出错，麻烦常常不是“它错了”，而是没人能重建当时的状态。${company.name} 想给团队一个安全的调试环境，把失败现场重新搭出来。`,
      `想象一个智能体在真实客户流程里操作失败，日志只有一半，权限、数据和工具状态都对不上。${company.name} 试图把这些线索放进可复现的沙盒里，让工程团队能查清楚。`
    ]);
  }
  if (text.includes("website workflows") || text.includes("browser automation") || text.includes("playwright") || text.includes("reusable scripts")) {
    return pickForCompany(company, [
      `假如你想让智能体稳定操作一个复杂网站，不能每次都让它临场看页面、猜按钮、慢慢点击。那样又贵又慢，页面一变还容易坏。${company.name} 想${normalizeAction(chineseProduct)}。`,
      `很多网站流程看起来只是点几下，但真交给智能体做，就会遇到登录、跳转、页面变化和错误状态。${company.name} 的思路是把这些动作沉淀成可维护的流程。`,
      `如果一个团队每天都要从老网站里查数据、提交表单或导出文件，实时浏览器自动化很容易变成黑盒。${company.name} 想把这些网页动作变成更清楚的代码和脚本。`
    ]);
  }
  if (text.includes("behavioral health") || text.includes("mental health") || text.includes("utilization review") || text.includes("audits")) {
    return pickForCompany(company, [
      `如果你在心理健康或成瘾治疗诊所工作，很多时间会被文档、合规、审计和保险审核吃掉。病人需要照护，但工作人员总被后台行政工作拉走。${company.name} 想${normalizeAction(chineseProduct)}。`,
      `行为健康诊所最缺的往往不是表格，而是能把护理记录、合规材料和保险审核连起来的后台能力。${company.name} 想让诊所少在行政流程里空转。`,
      `治疗师应该把更多时间留给病人，但现实里大量时间会被记录、审查和付款流程占掉。${company.name} 切入的是这块不显眼但很重的后台负担。`
    ]);
  }
  if (text.includes("defect") || text.includes("inspection") || text.includes("quality inspection") || text.includes("quality control") || text.includes("manufacturing quality")) {
    return pickForCompany(company, [
      `假如你在工厂负责质检，最怕的是产品出了小缺陷却没被发现。人眼检查会累，传统视觉规则又很脆弱，一换零件或产线就要重新调。${company.name} 想${normalizeAction(chineseProduct)}。`,
      `工厂质检最麻烦的是变化太多，零件、产线和缺陷类型一变，老规则就不够用了。${company.name} 想让视觉检测更快适应真实生产。`,
      `如果每个零件都靠人工看，速度和稳定性都会到瓶颈；如果完全靠老式规则，又很难适应新产品。${company.name} 想把质检模型部署得更快。`
    ]);
  }
  if (text.includes("refurbish") || text.includes("e-waste") || text.includes("discarded electronics") || text.includes("second-hand")) {
    return `如果你在电子设备回收或翻新工厂，面前可能是一批型号、状态、价值都不同的旧电脑。每台都要测试、清数据、拍照、上架，靠人处理很慢。${company.name} 想${normalizeAction(chineseProduct)}。`;
  }
  if (text.includes("dealership") || text.includes("test drive") || text.includes("oil change") || text.includes("recall")) {
    return `假如你经营汽车经销店，很多客户会在下班后打电话，想问车、约试驾或预约保养。电话没人接，线索可能就去了竞争对手那里。${company.name} 想${normalizeAction(chineseProduct)}。`;
  }
  if (text.includes("health") || text.includes("medical") || text.includes("clinical") || text.includes("patient")) {
    return pickForCompany(company, [
      `假如你在诊所或医院负责一天的运营，最烦的往往不是一个大问题，而是病人信息、保险确认、医生安排和后续跟进散在很多地方。${company.name} 想帮你把这些琐碎但不能出错的环节串起来。`,
      `医疗团队每天都在和信息断点打交道，病人、保险、排班、账单和随访常常不在同一个地方。${company.name} 想把其中一段流程变得更顺。`,
      `从病人预约到后续跟进，中间很多工作不是医学难题，却会消耗诊所大量时间。${company.name} 切入的是这些容易拖慢服务的后台环节。`
    ]);
  }
  if (text.includes("fintech") || text.includes("finance") || text.includes("banking") || text.includes("insurance")) {
    return pickForCompany(company, [
      `假如你在金融机构工作，每天要判断一笔申请、一次交易或一份材料到底靠不靠谱，麻烦常常在于信息又多又散，还必须留下清楚记录。${company.name} 想帮你先整理材料、找出异常。`,
      `金融和保险里的很多工作并不是缺人判断，而是材料太散、规则太多、过程还必须可追溯。${company.name} 想把这类判断前的准备工作自动化。`,
      `如果一笔交易或一份保单要靠人来回核对文件，速度慢只是表面问题，真正麻烦的是漏看和无法解释。${company.name} 想让这段流程更清楚。`
    ]);
  }
  if (text.includes("robot") || text.includes("manufacturing") || text.includes("industrial")) {
    return pickForCompany(company, [
      `设想你在工厂或机器人团队里，真正头疼的不是演示能不能跑一次，而是任务每天变化、现场条件不稳定、调试成本很高。${company.name} 想${normalizeAction(chineseProduct)}。`,
      `工业现场的难点通常不在概念，而在机器能不能稳定适应真实环境。${company.name} 想把原本靠人反复试错的一段做得更可复制。`,
      `制造业和机器人项目经常卡在落地阶段，现场变化、设备约束和维护成本都会放大问题。${company.name} 试图把其中一块流程做成更稳定的工具。`
    ]);
  }
  if (text.includes("developer") || text.includes("infrastructure") || text.includes("devtools") || text.includes("api")) {
    return pickForCompany(company, [
      `如果你是工程负责人，新功能上线前最怕的不是多写几行代码，而是底层系统不稳定、权限不清楚、故障没人知道从哪里查。${company.name} 想${normalizeAction(chineseProduct)}。`,
      `开发者工具的价值常常藏在少踩坑里。团队要交付业务功能，但会被集成、权限、调试和部署拖住。${company.name} 想把其中一段基础工作做薄。`,
      `工程团队不缺新工具，缺的是能减少等待和返工的工具。${company.name} 如果能让一个复杂环节更可靠，就有机会嵌进日常开发流程。`
    ]);
  }
  if (text.includes("sales") || text.includes("marketing") || text.includes("customer") || text.includes("support")) {
    return pickForCompany(company, [
      `如果你负责销售、市场或客服，日常工作常常不是缺想法，而是客户信息太散、跟进太多、每个人说法不一致。${company.name} 想${normalizeAction(chineseProduct)}。`,
      `面向客户的团队最怕线索漏掉、话术不一致、该升级的问题没人接。${company.name} 想把这些分散动作收拢到更清楚的流程里。`,
      `客户沟通看起来是聊天，背后其实是大量记录、判断和下一步动作。${company.name} 想让团队更快知道该联系谁、说什么、何时交给人。`
    ]);
  }
  if (text.includes("data") || text.includes("analytics") || text.includes("intelligence")) {
    return `假如你负责做一个重要决定，问题通常不是完全没有数据，而是数据散在报表、文档和系统里，没人能很快讲清楚发生了什么。${company.name} 想${normalizeAction(chineseProduct)}。`;
  }
  if (text.includes("hr") || text.includes("payroll") || text.includes("recruit")) {
    return `如果你在人力或运营团队，每天会被入职、工资、排班、候选人和合规材料反复打断。${company.name} 想${normalizeAction(chineseProduct)}。`;
  }

  return pickForCompany(company, [
    `如果你是这类业务的一线负责人，最常见的痛苦往往不是一个惊天动地的大问题，而是一堆靠人、表格和邮件勉强维持的细碎流程。${company.name} 想${normalizeAction(chineseProduct)}。`,
    `很多垂直行业的软件机会，看起来都只是把杂活整理好。${company.name} 面对的也是这种问题，关键在于能不能让用户少切系统、少追材料。`,
    `有些公司一开始并不容易一句话讲清，因为它们不是在做新入口，而是在重做某个后台流程。${company.name} 想把一段原本分散的工作收紧。`
  ]);
}

function normalizeAction(value) {
  const text = String(value || "").trim();
  if (text.startsWith("帮") || text.startsWith("把") || text.startsWith("给")) return text;
  return `让${text}`;
}

function pickForCompany(company, variants) {
  return variants[Math.floor(seededNoise(`${company.slug || company.id || company.name}:copy`) * variants.length) % variants.length];
}

async function getCompanies(excludedIds = new Set(), date = TODAY) {
  cachedCompanies ||= await getCompanyPool();
  const { ycCompanies, externalCompanies } = cachedCompanies;

  const activeCompanies = ycCompanies
    .filter((company) => company.status === "Active")
    .filter((company) => northAmericaScore(company) > 0)
    .filter((company) => cleanText(company.one_liner || company.long_description).length > 20);

  const ycCandidates = activeCompanies
    .filter((company) => !hasAnyKey(excludedIds, companyDedupeKeys(company)))
    .map((company) => ({
      company,
      score: companySelectionScore(company, date)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 300);

  const externalCandidates = externalCompanies
    .filter((company) => !hasAnyKey(excludedIds, companyDedupeKeys(company)))
    .map((company) => ({
      company,
      score: externalCompanySelectionScore(company, date)
    }))
    .sort((a, b) => b.score - a.score);

  const selectedExternal = pickExternalCompanies(externalCandidates, date, {
    minExternal: 3,
    maxExternal: 4,
    preferHardware: true,
    maxHardware: 1
  });
  const externalKeys = new Set(selectedExternal.flatMap((item) => companyDedupeKeys(item.company)));
  const selectedYc = pickDiverseCompanies(ycCandidates.filter((item) => !hasAnyKey(externalKeys, companyDedupeKeys(item.company)))).slice(0, 10 - selectedExternal.length);
  const selected = [...selectedExternal, ...selectedYc]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return Promise.all(selected
    .map(async ({ company }, index) => ({
      id: company.sourceType === "yc" ? `yc-${company.id}` : company.id,
      name: company.name,
      url: await resolveCompanyUrl(company),
      sourceUrl: company.url || "",
      location: company.all_locations || "Unknown",
      source: company.source || ["Y Combinator"],
      tags: company.tags?.slice(0, 5) ?? company.industries ?? [],
      batch: company.batch || "",
      isHiring: Boolean(company.isHiring),
      teamSize: company.team_size || 0,
      originalOneLiner: cleanText(company.one_liner || ""),
      originalDescription: cleanText(company.long_description || ""),
      story: companyStory(company),
      rank: index + 1
    })));
}

async function resolveCompanyUrl(company) {
  const website = company.website || "";
  const sourceUrl = company.url || "";
  if (website && (await isHealthyLink(website))) return website;
  return sourceUrl || website;
}

async function getCompanyPool() {
  const ycCompanies = await readJson(SOURCES.yc, "75");
  const externalCompanies = await getExternalCompanies();
  return { ycCompanies, externalCompanies };
}

async function getExternalCompanies() {
  const [productHunt, launchHn, curatedNonYc, curatedHardware] = await Promise.all([
    getProductHuntCompanies(),
    getLaunchHnCompanies(),
    getCuratedNonYcCompanies(),
    getCuratedHardwareCompanies()
  ]);
  const seen = new Set();
  return [...productHunt, ...launchHn, ...curatedNonYc, ...curatedHardware].filter((company) => {
    const key = normalizedTextKey(company.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getCuratedNonYcCompanies() {
  return CURATED_NON_YC_COMPANIES.map((company) =>
    externalCompany({
      ...company,
      source: "Non-YC watchlist"
    })
  );
}

async function getCuratedHardwareCompanies() {
  return CURATED_HARDWARE_COMPANIES.map((company) =>
    externalCompany({
      ...company,
      source: "Smart hardware watchlist"
    })
  );
}

async function getProductHuntCompanies() {
  try {
    const parsed = await readRss(SOURCES.productHunt);
    const entries = Array.isArray(parsed.feed?.entry) ? parsed.feed.entry : [];
    return entries.slice(0, 24).map((entry) => {
      const link = Array.isArray(entry.link) ? entry.link.find((item) => item.rel === "alternate")?.href : entry.link?.href || entry.link || "";
      const description = cleanText(entry.content?.text || entry.summary || "");
      const tagline = description.split("Discussion")[0]?.trim() || description;
      const name = cleanText(entry.title);
      return externalCompany({
        id: `ph-${normalizedTextKey(name).replace(/[^a-z0-9]+/g, "-")}`,
        name,
        website: link,
        sourceUrl: link,
        source: "Product Hunt",
        oneLiner: tagline,
        description: tagline,
        published: entry.published || entry.updated || ""
      });
    }).filter((company) => company.name && company.website && cleanText(company.one_liner).length > 10);
  } catch (error) {
    console.warn(`Product Hunt skipped: ${error.message}`);
    return [];
  }
}

async function getLaunchHnCompanies() {
  try {
    const data = await readJson(SOURCES.hnLaunch, "20");
    return (data.hits || [])
      .filter((hit) => hit.title && hit.url && /^Launch HN:/i.test(hit.title))
      .slice(0, 24)
      .map((hit) => {
        const parsed = parseLaunchHnTitle(hit.title);
        return externalCompany({
          id: `hn-launch-${hit.objectID}`,
          name: parsed.name,
          website: hit.url,
          sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
          source: "Launch HN",
          oneLiner: parsed.description,
          description: parsed.description,
          published: hit.created_at || ""
        });
      })
      .filter((company) => company.name && company.website && cleanText(company.one_liner).length > 10);
  } catch (error) {
    console.warn(`Launch HN skipped: ${error.message}`);
    return [];
  }
}

function parseLaunchHnTitle(title = "") {
  const cleaned = cleanText(title).replace(/^Launch HN:\s*/i, "");
  const match = cleaned.match(/^(.+?)(?:\s+\(|\s+-\s+|\s+–\s+|\s+:\s+)(.+)$/);
  if (!match) return { name: cleaned, description: cleaned };
  return {
    name: cleanText(match[1]),
    description: cleanText(match[2].replace(/\)$/g, ""))
  };
}

function externalCompany({ id, name, website, sourceUrl, source, oneLiner, description, published }) {
  return {
    id,
    sourceType: "external",
    name,
    slug: normalizedTextKey(name).replace(/[^a-z0-9]+/g, "-"),
    website,
    url: sourceUrl || website,
    all_locations: "Unknown",
    regions: [],
    source: [source],
    tags: inferCompanyTags(`${name} ${oneLiner} ${description}`),
    batch: "",
    isHiring: false,
    team_size: 0,
    one_liner: cleanText(oneLiner),
    long_description: cleanText(description || oneLiner),
    published
  };
}

function inferCompanyTags(value = "") {
  const text = value.toLowerCase();
  const tags = [];
  if (text.includes("ai") || text.includes("agent") || text.includes("model")) tags.push("AI");
  if (isHardwareText(text)) tags.push("Smart Hardware");
  if (text.includes("design") || text.includes("figma") || text.includes("ui")) tags.push("Design");
  if (text.includes("developer") || text.includes("api") || text.includes("code")) tags.push("Developer Tools");
  if (text.includes("sales") || text.includes("marketing") || text.includes("customer")) tags.push("Sales");
  if (text.includes("health") || text.includes("medical") || text.includes("patient")) tags.push("Health");
  if (text.includes("finance") || text.includes("payment") || text.includes("bank")) tags.push("Fintech");
  if (text.includes("data") || text.includes("analytics")) tags.push("Data");
  return tags.length ? tags : ["Product"];
}

function externalCompanySelectionScore(company, date = TODAY) {
  const recency = company.published ? Math.max(0, 20 - Math.abs(Date.parse(`${date}T00:00:00.000Z`) - Date.parse(company.published)) / 86400000) : 0;
  const trend = trendScore(company);
  const clarity = Math.min(cleanText(`${company.one_liner} ${company.long_description}`).length, 300) / 30;
  const sourceBoost = (company.source || []).includes("Product Hunt") ? 12 : 8;
  const hardwareBoost = isHardwareCompany(company) ? 18 : 0;
  const rotation = seededNoise(`${date}:${company.id}`) * 20;
  return sourceBoost + hardwareBoost + recency + trend + clarity + rotation;
}

function companySelectionScore(company, date = TODAY) {
  const year = batchScore(company.batch);
  const currentYear = Number(date.slice(0, 4));
  const recency = year ? Math.max(0, 8 - Math.abs(currentYear - year)) : 0;
  const traction = (company.top_company ? 25 : 0) + (company.isHiring ? 10 : 0) + Math.min(company.team_size || 0, 200) / 20;
  const description = cleanText(`${company.one_liner ?? ""} ${company.long_description ?? ""}`);
  const clarity = Math.min(description.length, 500) / 50;
  const trend = trendScore(company);
  const rotation = seededNoise(`${date}:${company.id}`) * 30;

  return northAmericaScore(company) * 20 + recency * 8 + traction + clarity + trend + rotation;
}

function trendScore(company) {
  const text = `${company.one_liner ?? ""} ${company.long_description ?? ""} ${company.tags?.join(" ") ?? ""} ${company.subindustry ?? ""}`.toLowerCase();
  const keywords = ["ai", "agent", "robot", "hardware", "wearable", "device", "glasses", "sensor", "voice recorder", "insurance", "health", "fintech", "developer", "infrastructure", "climate", "data", "workflow", "automation", "security", "design", "product"];
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 6 : 0), 0);
}

function pickExternalCompanies(scoredCompanies, date, { minExternal = 3, maxExternal = 4, preferHardware = true, maxHardware = 1 } = {}) {
  const selected = [];
  const selectedKeys = new Set();

  const selectedHardwareCount = () => selected.filter((item) => isHardwareCompany(item.company)).length;

  const add = (item) => {
    const keys = companyDedupeKeys(item.company);
    if (!keys.length || keys.some((key) => selectedKeys.has(key))) return false;
    if (isHardwareCompany(item.company) && selectedHardwareCount() >= maxHardware) return false;
    selected.push(item);
    keys.forEach((key) => selectedKeys.add(key));
    return true;
  };

  if (preferHardware) {
    const hardwareCandidates = scoredCompanies
      .filter((item) => isHardwareCompany(item.company))
      .sort((a, b) => seededNoise(`${date}:${b.company.id}:hardware`) - seededNoise(`${date}:${a.company.id}:hardware`));
    for (const item of hardwareCandidates) {
      if (add(item)) break;
    }
  }

  for (const item of pickDiverseCompanies(scoredCompanies.filter((item) => !isHardwareCompany(item.company)))) {
    if (selected.length >= maxExternal) break;
    add(item);
  }

  if (selected.length < minExternal) {
    for (const item of scoredCompanies) {
      if (selected.length >= minExternal) break;
      add(item);
    }
  }

  return selected.slice(0, maxExternal);
}

function isHardwareCompany(company) {
  return isHardwareText(`${company.name ?? ""} ${company.one_liner ?? ""} ${company.long_description ?? ""} ${company.tags?.join(" ") ?? ""} ${company.source?.join(" ") ?? ""}`);
}

function isHardwareText(value = "") {
  return /\b(hardware|wearable|device|sensor|glasses|smart ring|voice recorder|camera|robot|robotics|drone|earbuds|headset|pendant)\b/i.test(value);
}

function pickDiverseCompanies(scoredCompanies) {
  const selected = [];
  const seenIndustries = new Map();

  for (const item of scoredCompanies) {
    const industry = item.company.industry || "Other";
    const count = seenIndustries.get(industry) || 0;
    if (count >= 3) continue;

    selected.push(item);
    seenIndustries.set(industry, count + 1);
    if (selected.length === 10) return selected;
  }

  for (const item of scoredCompanies) {
    if (selected.some((selectedItem) => selectedItem.company.id === item.company.id)) continue;
    selected.push(item);
    if (selected.length === 10) break;
  }

  return selected;
}

function seededNoise(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function normalizeRssItem(item, source) {
  const title = cleanText(item.title);
  const link = item.link || item.guid?.text || item.guid || "";
  const description = cleanText(item.description || item["content:encoded"] || "");
  const date = item.pubDate || item.published || item.updated || "";

  return {
    id: `${source}-${Buffer.from(link || title).toString("base64url").slice(0, 12)}`,
    title,
    url: link,
    source,
    published: date,
    story: readingStory({ title, source, description })
  };
}

function readingStory(item) {
  const topic = inferReadingTopic(item.title);
  return `这篇来自 ${item.source}，主题和${topic}有关。可以把它当成一个观察窗口。它可能在解释某个市场为什么变热，也可能在解释某类公司为什么出现。读的时候重点看它指出了什么变化，以及谁会因此受益。`;
}

function inferReadingTopic(title = "") {
  const text = title.toLowerCase();
  if (text.includes("ai") || text.includes("model") || text.includes("inference")) return "人工智能和它背后的基础设施";
  if (text.includes("fund") || text.includes("raise") || text.includes("invest") || text.includes("valuation")) return "融资、估值和投资趋势";
  if (text.includes("startup") || text.includes("founder")) return "创业公司和创始人";
  if (text.includes("security") || text.includes("hack") || text.includes("privacy")) return "安全和隐私";
  if (text.includes("robot")) return "机器人和自动化";
  if (text.includes("chip") || text.includes("gpu") || text.includes("compute")) return "芯片、算力和技术基础设施";
  if (text.includes("health") || text.includes("bio")) return "医疗健康和生物科技";
  return "创业、技术趋势或公司建设";
}

async function getRssReadings() {
  const feeds = [
    ["TechCrunch Startups", SOURCES.techCrunchStartups],
    ["TechCrunch AI", SOURCES.techCrunchAI],
    ["TechCrunch", SOURCES.techCrunchMain]
  ];

  const results = [];

  for (const [source, url] of feeds) {
    try {
      const parsed = await readRss(url);
      const channel = parsed.rss?.channel || parsed.feed;
      const items = Array.isArray(channel?.item) ? channel.item : Array.isArray(channel?.entry) ? channel.entry : [];
      results.push(...items.slice(0, 5).map((item) => normalizeRssItem(item, source)));
    } catch (error) {
      console.warn(`RSS skipped: ${source}: ${error.message}`);
    }
  }

  return results;
}

function getEvergreenReadings(date = TODAY) {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00.000Z`) / 86400000);
  return EVERGREEN_READINGS.map((item, index) => ({ item, sort: (index * 7 + dayNumber) % EVERGREEN_READINGS.length }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => ({
      ...item,
      published: "",
      story: item.story || evergreenStory(item)
    }))
    .filter((item) => !isBlockedReading(item));
}

function evergreenStory(item) {
  const title = `${item.title || ""} ${item.topic || ""}`.toLowerCase();
  if (title.includes("service blueprint") || title.includes("服务设计")) {
    return "一个服务看起来顺不顺，常常不只取决于页面好不好看。比如用户点了退款按钮，背后可能有客服确认、仓库拦截、财务记录和系统同步，任何一环慢了，用户都会觉得产品坏了。服务蓝图这篇值得读，是因为它教你把这些藏在页面背后的步骤画出来。读的时候重点看它怎样区分用户看得见的动作和公司内部真正要配合的工作。";
  }
  if (title.includes("journey") || title.includes("用户旅程")) {
    return "很多产品问题不是发生在某一个按钮上，而是发生在一段路上。用户从第一次听说产品，到注册、试用、付费，中间每一步都可能卡住，单看一个页面很难发现原因。用户旅程这类文章值得读，是因为它帮你把零散体验连成一条路。读的时候重点看作者怎样找到用户犹豫、放弃或需要帮助的时刻。";
  }
  if (title.includes("strategy") || title.includes("策略")) {
    return "产品团队越往后走，越不缺想做的事情。客户会提需求，销售会带回机会，团队自己也会想到新功能，真正难的是决定什么先不做。这类产品策略文章值得读，是因为它帮你理解取舍从哪里来。读的时候重点看作者怎样把用户、市场和公司目标放在一起判断。";
  }
  return `很多关于${item.topic}的问题，刚开始看都像常识，真正做起来才会发现细节很难。团队会在选择、沟通、执行或用户理解上反复踩坑，而这类文章的价值就是把这些坑讲清楚。读的时候不要只看结论，可以把它当成一个拆解样本：作者怎样发现真正的问题，怎样判断哪些事重要，怎样把一个产品或团队选择讲明白。`;
}

async function getHnReadings() {
  try {
    const data = await readJson(SOURCES.hn);
    return data.hits
      .filter((hit) => hit.title && hit.url)
      .slice(0, 6)
      .map((hit) => ({
        id: `hn-${hit.objectID}`,
        title: cleanText(hit.title),
        url: hit.url,
        source: "Hacker News",
        published: hit.created_at,
        story: `这条正在 Hacker News 这类技术社区里被讨论。标题是 “${cleanText(hit.title)}”。它的价值不只在原文，还在于它可能代表工程师、创业者或早期用户正在关心的一个问题。读它时可以先问，为什么技术社区会讨论它，它背后是不是有新工具、新公司或新的技术路线。`
      }));
  } catch (error) {
    console.warn(`HN skipped: ${error.message}`);
    return [];
  }
}

async function main() {
  const existingFeed = await readExistingFeed();
  const excludedCompanyIds = recentCompanyIds(existingFeed);

  let companies = [];
  try {
    companies = await getCompanies(excludedCompanyIds);
  } catch (error) {
    console.warn(`YC skipped: ${error.message}`);
  }

  const evergreenReadings = getEvergreenReadings();
  const rssReadings = await getRssReadings();
  const hnReadings = await getHnReadings();
  const seen = new Set();
  const readings = [...evergreenReadings, ...rssReadings, ...hnReadings]
    .filter((item) => {
      const key = readingDedupeKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);

  const todayFeed = {
    date: TODAY,
    companies,
    readings
  };
  const previousDays = (existingFeed.days || []).filter((day) => day.date !== TODAY);

  const feed = {
    generatedAt: new Date().toISOString(),
    days: [todayFeed, ...previousDays].sort((a, b) => b.date.localeCompare(a.date))
  };

  await mkdir(new URL("../src/data", import.meta.url), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(feed, null, 2)}\n`);
  console.log(`Wrote ${OUT_FILE.pathname}`);
  console.log(`Companies: ${companies.length}, readings: ${readings.length}`);
  console.log(`Days: ${feed.days.map((day) => day.date).join(", ")}`);
}

export async function generateLiveFeed({
  daysBack = 7,
  today = currentLosAngelesDate(),
  initialExcludedCompanyIds = new Set(),
  initialUsedReadingKeys = new Set(),
  checkReadingLinks = false
} = {}) {
  const days = [];
  const excludedCompanyIds = new Set(initialExcludedCompanyIds);
  const usedReadingKeys = new Set(initialUsedReadingKeys);

  for (let index = 0; index < daysBack; index += 1) {
    const date = shiftDate(today, -index);
    const companies = await getCompanies(excludedCompanyIds, date);
    for (const company of companies) {
      for (const key of companyDedupeKeys(company)) {
        excludedCompanyIds.add(key);
      }
    }

    const readingCandidates = getEvergreenReadings(date);
    const readings = checkReadingLinks
      ? await pickHealthyReadings(readingCandidates, usedReadingKeys)
      : pickUniqueReadings(readingCandidates, usedReadingKeys);

    days.push({
      date,
      companies,
      readings
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    days
  };
}

function pickUniqueReadings(readings, usedReadingKeys, count = 3) {
  const candidates = readings
    .filter((reading) => !isBlockedReading(reading))
    .filter((reading) => {
      const key = readingDedupeKey(reading);
      return key && !usedReadingKeys.has(key);
    });

  return pickDiverseReadings(candidates, {
    usedReadingKeys,
    count
  });
}

async function pickHealthyReadings(readings, usedReadingKeys, count = 3) {
  const candidates = readings
    .filter((reading) => !isBlockedReading(reading))
    .filter((reading) => {
      const key = readingDedupeKey(reading);
      return key && !usedReadingKeys.has(key);
    });

  const checks = await Promise.all(
    candidates.map(async (reading) => ({
      reading,
    healthy: await isHealthyLink(reading.url)
    }))
  );
  const healthy = checks
    .filter((item) => item.healthy)
    .map((item) => item.reading)
    .slice(0, 24);

  return pickDiverseReadings(healthy, {
    usedReadingKeys,
    count
  });
}

function pickDiverseReadings(readings, { usedReadingKeys, count = 3 }) {
  const selected = [];
  const dailySources = new Set();
  const dailyThemes = new Set();

  const tryPick = ({ enforceDailySource, enforceDailyTheme }) => {
    for (const reading of readings) {
      if (selected.length >= count) break;
      const key = readingDedupeKey(reading);
      if (!key || usedReadingKeys.has(key)) continue;
      const source = readingSourceKey(reading);
      const theme = readingThemeKey(reading);
      if (enforceDailySource && source && dailySources.has(source)) continue;
      if (enforceDailyTheme && theme && dailyThemes.has(theme)) continue;

      selected.push(reading);
      usedReadingKeys.add(key);
      if (source) dailySources.add(source);
      if (theme) dailyThemes.add(theme);
    }
  };

  tryPick({ enforceDailySource: true, enforceDailyTheme: true });
  tryPick({ enforceDailySource: false, enforceDailyTheme: true });
  tryPick({ enforceDailySource: false, enforceDailyTheme: false });

  return selected.slice(0, count);
}

async function isHealthyLink(url) {
  if (!url || String(url).includes("example.com")) return false;

  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(3000),
      headers: { "user-agent": "Mozilla/5.0 startup-radar-link-check" }
    });

    if ([403, 405, 406].includes(response.status)) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
        headers: { "user-agent": "Mozilla/5.0 startup-radar-link-check" }
      });
    }

    if (response.status < 200 || response.status >= 400) return false;
    const finalUrl = response.url || "";
    return !/\/404(?:\/|$)|not[-_]?found/i.test(finalUrl);
  } catch {
    return false;
  }
}

function shiftDate(date, offsetDays) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function recentCompanyIds(feed) {
  return new Set(
    (feed.days || [])
      .filter((day) => day.date !== TODAY)
      .slice(0, 7)
      .flatMap((day) => day.companies || [])
      .flatMap((company) => companyDedupeKeys(company))
      .filter(Boolean)
  );
}

async function readExistingFeed() {
  try {
    return JSON.parse(await readFile(OUT_FILE, "utf8"));
  } catch {
    return { generatedAt: "", days: [] };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
