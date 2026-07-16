import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import feedData from "./data/feed.json";
import { capturePageview, initializeAnalytics, installGlobalClickTracking } from "./analytics";
import "./styles.css";

initializeAnalytics();

type Company = {
  id: string;
  name: string;
  url?: string;
  location?: string;
  source?: string[];
  tags?: string[];
  original?: string;
  oneLine?: string;
  explanation?: string;
  moat?: string;
  signals?: string[];
  date?: string;
  story?: string;
  rank?: number;
};

type ReadingItem = {
  id: string;
  title: string;
  url?: string;
  source?: string;
  author?: string;
  published?: string;
  tags?: string[];
  narration?: string;
  whyRead?: string;
  context?: string;
  date?: string;
  minutes?: number;
  story?: string;
};

type DailyFeed = {
  date: string;
  updatedAt?: string;
  companies: Company[];
  readings: ReadingItem[];
};

const companies: Company[] = [
  {
    id: "c1",
    name: "FieldOS",
    url: "https://example.com/fieldos",
    location: "San Francisco, CA",
    source: ["YC", "Product Hunt", "HN"],
    tags: ["AI", "Industrial", "Workflow"],
    original: "AI operations layer for field service teams managing complex physical assets.",
    oneLine: "给现场维修和运维团队用的 AI 工作台。",
    explanation: "FieldOS 做的是给工厂、能源、通信等现场维修团队用的 AI 工作台。你可以把它想成一个很懂公司设备资料的现场助理：维修人员站在机器旁边，不需要翻一堆手册、旧工单、零件表和专家邮件，只要把故障现象问出来，系统就能帮他查这台设备以前出过什么问题、下一步应该检查哪里、可能需要什么零件。它解决的不是“让 AI 聊天”这种抽象问题，而是现场人员每天都会遇到的具体问题：信息散在很多系统里，老师傅经验难传，新人排障慢，停机时间很贵。",
    moat: "它的竞争力主要来自行业数据和工作流嵌入。如果它能长期接入客户的设备历史、维修记录、零件库存和操作规范，就会越来越懂每个客户自己的现场情况，新竞争者很难只靠一个通用模型复制。另一个优势是它直接嵌在维修流程里，只要能减少停机时间或少派一次专家，客户就容易算清楚价值。",
    signals: ["近期产品发布", "技术社区讨论增长", "面向真实线下行业"],
    date: "2026-06-19"
  },
  {
    id: "c2",
    name: "Harbor Compute",
    url: "https://example.com/harbor-compute",
    location: "Seattle, WA",
    source: ["Company blog", "Investor note"],
    tags: ["Infra", "AI", "Cloud"],
    original: "A scheduling platform that routes AI workloads across underused regional GPU capacity.",
    oneLine: "帮 AI 公司找到更便宜、更空闲 GPU 的调度平台。",
    explanation: "Harbor Compute 做的是 AI 算力调度。大白话说，如果 GPU 像发电站，AI 公司每天要用很多电，但不同地方的电价和空闲程度都不一样，这家公司就像一个调度员，帮客户把模型训练、推理或批处理任务送到更便宜、更空闲、更合适的机器上。它不一定自己拥有所有 GPU，而是把不同地区、不同供应商的算力资源组织起来，让客户不用自己一家家谈、一台台管。",
    moat: "它的竞争力在于供给网络和调度能力。GPU 市场不是简单比谁便宜，还要考虑可用性、延迟、稳定性、数据位置和任务类型。如果 Harbor Compute 能拿到足够多的区域 GPU 供给，并且用调度算法持续证明能省钱或提高稳定性，就会形成网络效应：供给越多，客户越容易找到合适资源；客户越多，它也越有能力和供应方谈条件。",
    signals: ["GPU 市场供需错配", "基础设施付费意愿强", "多云趋势"],
    date: "2026-06-19"
  },
  {
    id: "c3",
    name: "LedgerLight",
    url: "https://example.com/ledgerlight",
    location: "New York, NY",
    source: ["Product Hunt", "Founder blog"],
    tags: ["FinTech", "Accounting", "SMB"],
    original: "Automated month-end close for small finance teams using bank, payroll, and invoice data.",
    oneLine: "给小公司财务团队用的自动月结工具。",
    explanation: "LedgerLight 帮小公司财务团队做月结。很多公司每个月结束后，财务都要把银行流水、工资、发票、报销和会计系统里的记录对起来，找哪里漏了、哪里不匹配、哪些数字要解释。LedgerLight 就像一个会整理账本的助理，先把这些数据自动拉进来、归类、对账、标出异常，让财务人员不用从零开始翻表格。",
    moat: "它的竞争力取决于连接能力和异常判断能力。财务软件不是写一个漂亮界面就够了，难点是稳定接入银行、工资、发票和会计工具，并且知道哪些不一致是真问题、哪些只是正常延迟。如果它能把常见财务流程做得足够可靠，客户一旦把每月关账流程交给它，迁移成本会变高。",
    signals: ["SMB 工具需求稳定", "自动化价值清晰", "有明确付费场景"],
    date: "2026-06-19"
  },
  {
    id: "c4",
    name: "Northstar BioModels",
    url: "https://example.com/northstar",
    location: "Boston, MA",
    source: ["Research mention", "Accelerator"],
    tags: ["Bio", "AI", "Research"],
    original: "Simulation models for early drug discovery teams validating protein interaction hypotheses.",
    oneLine: "帮早期药物研发团队更快验证生物假设的模型工具。",
    explanation: "Northstar BioModels 做的是药物研发早期的模拟工具。不要把它理解成“AI 直接发明新药”，更准确的说法是：科学家在真正做昂贵实验之前，先用模型推演某个蛋白、分子或相互作用是否值得试。它像实验室前面的筛选器，帮助研发团队少走一些明显不靠谱的方向，把有限的钱和实验资源集中到更可能成功的假设上。",
    moat: "它的竞争力来自科学数据、模型可信度和研究流程结合。生物医药客户不会因为模型说得好听就相信它，必须看到预测和真实实验之间有相关性。如果 Northstar 能在某些具体药物发现场景里积累验证结果，并进入科研团队的日常决策流程，它就会比通用 AI 工具更有壁垒。",
    signals: ["来自研究社区", "高复杂度高价值领域", "可解释性需求强"],
    date: "2026-06-19"
  },
  {
    id: "c5",
    name: "Patchwork Robotics",
    url: "https://example.com/patchwork",
    location: "San Jose, CA",
    source: ["Demo video", "HN"],
    tags: ["Robotics", "Manufacturing"],
    original: "Low-cost robotic cells for short-run electronics assembly.",
    oneLine: "给小批量电子制造用的低成本机器人工作站。",
    explanation: "Patchwork Robotics 做的是小批量电子制造用的机器人工作站。传统自动化产线很贵，适合生产同一种东西很多年；但很多硬件团队、小工厂或定制电子产品，每次只做几百到几千件，任务变化快，买完整产线不划算。Patchwork 的思路是做更小、更便宜、能快速换任务的机器人单元，让小批量生产也能用上自动化。",
    moat: "它的竞争力在于硬件成本、部署速度和现场稳定性。机器人公司最难的不是 demo，而是到了客户工厂以后能不能持续工作、换线是否足够快、维护是否足够简单。如果 Patchwork 能把调试时间和单元成本压下来，就可能占住传统大厂不愿服务的长尾制造市场。",
    signals: ["硬件演示", "制造业自动化", "短批次需求增长"],
    date: "2026-06-19"
  },
  {
    id: "c6",
    name: "CivicLayer",
    url: "https://example.com/civiclayer",
    location: "Toronto, Canada",
    source: ["GovTech blog", "Product launch"],
    tags: ["GovTech", "Data", "Workflow"],
    original: "Case management and public data workflow software for local government teams.",
    oneLine: "给地方政府部门用的案件和数据流程系统。",
    explanation: "CivicLayer 给地方政府部门做案件和数据流程软件。普通人看到的是申请许可证、提交投诉、查询公开数据；政府工作人员背后要处理大量表格、审批、跨部门沟通和记录留存。CivicLayer 想把这些散乱流程放进一个更现代的系统里，让工作人员知道每个事项到哪一步、谁该处理、哪些数据可以公开。",
    moat: "它的竞争力在于采购进入门槛和流程沉淀。政府客户难卖，但一旦进去了、跑顺了，通常不会频繁更换系统。它如果能理解地方政府的审批、合规、公开记录和权限要求，就会比通用项目管理工具更难被替代。",
    signals: ["北美公共部门", "工作流刚需", "替代老旧系统"],
    date: "2026-06-19"
  },
  {
    id: "c7",
    name: "Mintvector",
    url: "https://example.com/mintvector",
    location: "Austin, TX",
    source: ["Product Hunt", "Newsletter"],
    tags: ["Developer Tools", "Security"],
    original: "Dependency risk scoring for engineering teams shipping AI-generated code.",
    oneLine: "帮工程团队检查 AI 写代码时引入的依赖风险。",
    explanation: "Mintvector 做的是 AI 编程时代的代码依赖风险检查。现在工程师让 AI 写代码时，AI 可能顺手引入一个开源库、复制一段陌生代码，或者建议一种看起来能跑但没人认真审过的实现。Mintvector 就像代码仓库旁边的安全审查员，提醒团队：这个依赖维护得好吗、有没有安全漏洞、许可证是否有问题、是不是 AI 瞎推荐的冷门包。",
    moat: "它的竞争力在于开发流程位置和风险数据。安全工具如果只是事后扫描，很容易被忽略；如果能嵌入 pull request、CI、IDE 或 AI coding assistant 里，在代码进入主分支前就提醒，就更有价值。随着 AI 生成代码越来越多，企业会更需要这类可审计的安全层。",
    signals: ["AI coding 趋势", "安全预算存在", "开发流程嵌入点清晰"],
    date: "2026-06-19"
  },
  {
    id: "c8",
    name: "RelayCare",
    url: "https://example.com/relaycare",
    location: "Los Angeles, CA",
    source: ["Healthcare newsletter", "Company site"],
    tags: ["Health", "AI", "Operations"],
    original: "Patient follow-up automation for specialty clinics after procedures and visits.",
    oneLine: "帮专科诊所自动跟进病人的术后和复诊沟通。",
    explanation: "RelayCare 做的是诊所和病人之间的自动跟进。比如病人做完一个小手术、检查或专科治疗后，诊所需要提醒他注意事项、问恢复情况、安排复诊，并在异常时让工作人员介入。RelayCare 不像医生那样做诊断，更像诊所的沟通助理：自动发消息、收集反馈、把真正需要人工处理的情况筛出来。",
    moat: "它的竞争力在于医疗场景的合规、模板和运营结果。普通客服机器人不能直接搬到医疗里用，因为沟通内容、隐私、升级规则都很敏感。如果 RelayCare 能证明它减少漏跟进、减少人工电话、提高复诊率，同时保持合规，就会有比较清楚的销售理由。",
    signals: ["医疗运营", "低监管风险场景", "清晰 ROI"],
    date: "2026-06-19"
  },
  {
    id: "c9",
    name: "TraceGarden",
    url: "https://example.com/tracegarden",
    location: "Vancouver, Canada",
    source: ["Climate tech digest", "Founder post"],
    tags: ["Climate", "Supply Chain"],
    original: "Supplier-level emissions tracking for mid-market food and beverage brands.",
    oneLine: "帮食品饮料品牌追踪供应商层面的碳排数据。",
    explanation: "TraceGarden 帮食品饮料品牌追踪供应链碳排。对这类公司来说，排放不只发生在办公室或工厂，还发生在原料种植、包装、运输、冷链和供应商生产环节。TraceGarden 想帮中型品牌把这些数据收集起来，回答一个朴素问题：我的产品到底在哪些环节产生了多少排放，哪些供应商或材料最值得优先优化。",
    moat: "它的竞争力在于供应商数据网络和行业模板。碳排工具很多，但食品饮料行业有自己的原料、包装和物流结构。如果它能让供应商更容易填报数据，并形成可复用的行业排放因子和报告模板，就会比通用表格或咨询服务更有效率。",
    signals: ["合规压力", "供应链数据碎片", "垂直场景明确"],
    date: "2026-06-19"
  },
  {
    id: "c10",
    name: "PromptDesk",
    url: "https://example.com/promptdesk",
    location: "San Francisco, CA",
    source: ["Product Hunt", "HN"],
    tags: ["AI", "Customer Support"],
    original: "Quality control and observability for AI customer support agents.",
    oneLine: "给 AI 客服代理做质检和监控的工具。",
    explanation: "PromptDesk 做的是 AI 客服的质检和监控。越来越多公司让 AI 直接回答客户问题，但老板真正担心的是：AI 有没有乱承诺、有没有漏掉重要投诉、该转人工的时候有没有转、回答质量下降时谁能发现。PromptDesk 不一定自己当客服，而是站在 AI 客服旁边做监控，记录它怎么回答、哪里出错、哪些问题最容易升级。",
    moat: "它的竞争力在于可观测性、评估体系和客服系统集成。AI 客服越多，公司越需要一套独立的质量控制层。如果 PromptDesk 能接入 Zendesk、Intercom、Salesforce 等系统，并持续积累哪些回答算好、哪些回答有风险的评估数据，它就会成为 AI agent 上线后的必要工具。",
    signals: ["AI agent 落地", "客服成本明确", "质量控制需求强"],
    date: "2026-06-19"
  }
];

const previousCompanies: Company[] = [
  {
    id: "p1",
    name: "ShiftFoundry",
    url: "https://example.com/shiftfoundry",
    location: "Chicago, IL",
    source: ["Founder post", "Industry newsletter"],
    tags: ["Manufacturing", "Workforce"],
    original: "Scheduling and training software for factories with high worker turnover.",
    oneLine: "给工厂排班和培训用的软件。",
    explanation: "ShiftFoundry 解决的是工厂一线人员流动大、排班复杂、培训跟不上的问题。很多工厂不是缺一个漂亮的 HR 系统，而是每天都要处理谁能上哪条线、谁缺什么证书、谁刚入职还不能独立操作设备。它把排班、技能记录和培训任务放在一起，让主管更容易安排人，也让新人更快达到可上岗状态。",
    moat: "它的竞争力来自对一线场景的细节理解。通用排班软件不会天然理解工位技能、设备资质、安全培训和班组约束。如果它能把这些工厂约束做深，并接入已有工资和考勤系统，就会更像生产运营工具，而不只是日历工具。",
    signals: ["垂直工作流", "劳动力短缺", "可量化效率提升"],
    date: "2026-06-18"
  },
  {
    id: "p2",
    name: "Atlas Inbox",
    url: "https://example.com/atlas-inbox",
    location: "San Francisco, CA",
    source: ["Product launch", "HN"],
    tags: ["AI", "Productivity"],
    original: "Personal research inbox that turns saved links into short briefings.",
    oneLine: "把收藏链接自动整理成研究简报的个人 inbox。",
    explanation: "Atlas Inbox 做的是个人信息整理。很多人每天收藏文章、报告、推文和网页，但真正读完的很少。它把这些链接放进一个 inbox，然后自动提炼重点、归类主题、标出哪些内容值得先读。简单说，它不是再给你一个收藏夹，而是帮你把收藏夹变成可读的研究材料。",
    moat: "它的竞争力取决于个人化和长期记忆。普通摘要工具只能压缩一篇文章，但如果 Atlas Inbox 能理解用户长期关心什么、哪些来源可信、哪些内容已经读过，它就能从“摘要器”变成私人研究助手。",
    signals: ["个人 AI 工作流", "信息过载", "明确使用频率"],
    date: "2026-06-18"
  },
  {
    id: "p3",
    name: "Northline Claims",
    url: "https://example.com/northline-claims",
    location: "Boston, MA",
    source: ["Insurance tech digest"],
    tags: ["Insurance", "Workflow"],
    original: "Claims review copilot for regional insurance carriers.",
    oneLine: "帮保险公司审核理赔材料的工作流助手。",
    explanation: "Northline Claims 给中小保险公司做理赔审核助手。理赔人员每天要看事故描述、照片、保单条款、历史记录和第三方报告，再判断还缺什么材料、是否符合条款、要不要升级给专家。它把这些材料先整理成可检查的清单，帮助审核员少漏信息、处理得更快。",
    moat: "它的竞争力在于保险条款和审核流程的结构化。保险理赔不是简单聊天，关键是证据、条款和责任边界。如果它能把不同险种和地区规则做成可靠流程，并保留审计记录，就会比通用 AI 助手更容易被保险公司采用。",
    signals: ["保险运营成本高", "流程标准化强", "审计需求明确"],
    date: "2026-06-17"
  }
];

const readings: ReadingItem[] = [
  {
    id: "r1",
    title: "The changing shape of AI infrastructure budgets",
    url: "https://example.com/ai-infra-budgets",
    source: "Infrastructure Notes",
    author: "M. Chen",
    published: "2026-06-17",
    tags: ["AI", "Infra", "Market"],
    narration: "这篇文章表面在讲 GPU 和推理成本，真正有用的地方是把 AI 公司成本结构拆开了：训练、推理、缓存、路由、监控分别是谁在收钱。读它可以帮助你判断哪些基础设施创业公司是在卖刚需，哪些只是在追热点。",
    whyRead: "适合理解为什么 AI infra 仍然会不断出现新公司。",
    context: "如果你不熟悉这个领域，可以先把 AI 基础设施理解成一家公司运行模型时背后的电费、机房、调度、监控和安全系统。",
    date: "2026-06-19",
    minutes: 11
  },
  {
    id: "r2",
    title: "How we redesigned onboarding for technical buyers",
    url: "https://example.com/technical-buyers",
    source: "Company Blog",
    author: "Growth Team",
    published: "2025-11-08",
    tags: ["SaaS", "Product", "Growth"],
    narration: "这不是一篇最新文章，但质量不错。它讲的是卖给工程团队时，产品体验不能只追求简单，还要让买家快速验证技术可信度。对看 B2B 创业公司很有帮助，因为很多公司失败不是因为产品没用，而是客户无法低成本确认它真的能用。",
    whyRead: "帮助判断开发者工具和基础设施产品的销售难点。",
    context: "技术买家通常不会被漂亮页面说服，他们关心文档、权限、集成成本、可回滚性和安全边界。",
    date: "2026-06-19",
    minutes: 8
  },
  {
    id: "r3",
    title: "Why vertical AI startups look boring before they work",
    url: "https://example.com/vertical-ai",
    source: "Investor Memo",
    author: "A. Rao",
    published: "2026-05-29",
    tags: ["AI", "Vertical SaaS"],
    narration: "这篇文章的价值在于提醒你：很多垂直 AI 公司早期看起来只是“把 ChatGPT 放进某个行业”，但真正的差异化可能藏在工作流、数据接入、合规和分发里。读的时候不要只看模型能力，要看它是否进入了客户每天必须完成的流程。",
    whyRead: "适合用来筛选 AI 套壳产品和真正有行业嵌入能力的公司。",
    context: "垂直 AI 指的是面向某个具体行业或岗位的 AI 产品，比如法律、医疗、保险、制造、客服等。",
    date: "2026-06-19",
    minutes: 9
  },
  {
    id: "r4",
    title: "Engineering constraints in small-batch robotics",
    url: "https://example.com/small-batch-robotics",
    source: "Robotics Lab Blog",
    author: "R. Patel",
    published: "2026-03-14",
    tags: ["Robotics", "Manufacturing"],
    narration: "这篇适合搭配今天的机器人公司一起读。它解释了为什么小批量制造难以自动化：任务变化快、夹具成本高、调试时间长。理解这些约束后，你会更容易看出一家机器人创业公司到底是在解决真实瓶颈，还是只是在展示一个好看的 demo。",
    whyRead: "帮助理解机器人创业公司的落地难度。",
    context: "机器人产品的难点通常不是让机器动起来，而是让它在客户现场稳定、便宜、可维护地工作。",
    date: "2026-06-19",
    minutes: 13
  },
  {
    id: "r5",
    title: "The next decade of compliance software",
    url: "https://example.com/compliance-software",
    source: "Operator Essay",
    author: "L. Morgan",
    published: "2024-09-02",
    tags: ["Compliance", "B2B", "Workflow"],
    narration: "这篇文章虽然旧，但很适合长期理解 B2B 软件。它把合规软件从“填表工具”重新解释成业务流程的一部分。很多看似无聊的创业公司，实际是在帮客户把法规、审计和日常运营连接起来。",
    whyRead: "帮助发现不性感但付费意愿强的创业方向。",
    context: "合规软件常见于金融、医疗、供应链、政府和安全领域，客户买它通常是为了降低风险和节省审计成本。",
    date: "2026-06-19",
    minutes: 10
  },
  {
    id: "r6",
    title: "What makes a startup source credible?",
    url: "https://example.com/source-credibility",
    source: "Research Notebook",
    author: "Editorial",
    published: "2026-06-01",
    tags: ["Research", "Media", "Method"],
    narration: "这篇可以作为本站的方法论。它提醒我们不要把单一发布、创始人自述或营销稿当成事实。更稳妥的做法是看交叉证据：产品发布、客户、融资、技术讨论、招聘、代码、行业背景是否互相印证。",
    whyRead: "帮助建立每天看新公司的判断标准。",
    context: "创业公司早期信息非常不完整，好的阅读系统应该明确区分事实、推断和不确定性。",
    date: "2026-06-19",
    minutes: 7
  }
];

const sampleFeeds: DailyFeed[] = [
  {
    date: "2026-06-19",
    updatedAt: "08:30",
    companies,
    readings
  },
  {
    date: "2026-06-18",
    updatedAt: "08:20",
    companies: previousCompanies.filter((company) => company.date === "2026-06-18"),
    readings: readings.slice(1, 4).map((item) => ({ ...item, id: `${item.id}-0618`, date: "2026-06-18" }))
  },
  {
    date: "2026-06-17",
    updatedAt: "08:25",
    companies: previousCompanies.filter((company) => company.date === "2026-06-17"),
    readings: readings.slice(3, 6).map((item) => ({ ...item, id: `${item.id}-0617`, date: "2026-06-17" }))
  }
];

const generatedFeed = feedData as { generatedAt?: string; days?: DailyFeed[] };
const fallbackFeeds = generatedFeed.days?.length ? generatedFeed.days : sampleFeeds;
const feedVersion = "2026-06-21-scheduled-feed-v1";

const companyStories: Record<string, string> = {
  c1: "这家公司值得关注，是因为它抓住了一个很现实的问题：很多工厂、能源公司和通信公司不是没有数据，而是数据散得到处都是，真正干活的人临场根本找不到。FieldOS 可以想成一个给维修师傅用的“会查资料的小帮手”。比如一台机器坏了，维修人员不用先翻厚厚的手册、旧工单和零件表，只要把现象告诉它，它就帮忙找这台设备以前出过什么问题、可能该检查哪里、要不要准备某个零件。它有竞争力的地方在于，如果它真的接进客户自己的设备记录和维修流程，它就会越来越懂这个客户的现场情况，而不是一个谁都能复制的通用聊天工具。",
  c2: "这家公司值得关注，是因为 AI 公司现在都很关心一件事：算力太贵，而且不稳定。Harbor Compute 做的事可以用一个很简单的比喻理解：如果 GPU 像很多地方的发电站，AI 公司每天都要用电，但每个地方的电价、空闲程度和稳定性不一样，它就像一个调度员，帮客户把任务送到此刻更便宜、更合适的机器上。它不一定自己拥有所有机器，而是把不同供应商的算力组织起来。它的竞争力在于供给网络和调度能力，资源越多，越容易帮客户找到好位置；客户越多，它也越有能力和算力供应方谈条件。",
  c3: "这家公司值得关注，是因为小公司的财务工作其实很痛苦，但外人很少注意。LedgerLight 做的是帮财务团队处理每个月的月结。你可以把它想成一个很耐心的账本整理员：它把银行流水、工资、发票、报销和会计系统里的记录拉到一起，先帮人找出哪里对不上、哪里缺材料、哪里可能是异常。它不是在做一个酷炫的新概念，而是在减少财务人员每个月重复翻表格的时间。它的竞争力在于连接能力和判断能力，因为财务工具一旦稳定接入公司的真实流程，客户通常不会轻易换掉。",
  c4: "这家公司值得关注，是因为药物研发很贵，哪怕少做一些没希望的实验，也能省下很多钱。Northstar BioModels 不要理解成“AI 直接发明新药”，更像是实验室门口的筛选器。科学家在真的花钱做实验前，可以先用它推演某个分子、蛋白或生物反应值不值得继续试。对外行来说，它像是在正式下厨前先闻一闻材料、看一看配方是不是靠谱。它的竞争力来自模型有没有被实验验证过，以及它能不能进入研究人员每天做判断的流程。",
  c5: "这家公司值得关注，是因为机器人行业最近一直热，但真正难的不是演示视频，而是能不能在真实工厂里便宜、稳定地干活。Patchwork Robotics 做的是给小批量电子制造用的小型机器人工作站。大工厂可以花很多钱建整条自动化产线，但小公司或定制工厂每次只做几百件、几千件，任务常常变，买大产线不划算。Patchwork 想做的是更小、更便宜、能快速换任务的机器人单元。它的竞争力在于部署速度、成本和稳定性，如果能让小工厂也用得起自动化，就会打开一个传统大厂不太愿意服务的市场。",
  c6: "这家公司值得关注，是因为政府软件通常很旧，但一旦换成好用的新系统，价值会很稳定。CivicLayer 做的是给地方政府部门用的办事流程软件。普通人看到的是申请许可证、提交投诉、查公开信息；工作人员背后要处理的是表格、审批、跨部门沟通和记录保存。CivicLayer 就像把一堆纸质夹子和老系统整理成一张清楚的办事清单，让每件事知道谁在处理、卡在哪里、哪些数据能公开。它的竞争力在于懂政府流程和合规要求，卖进去很难，但一旦真的跑顺了，客户也不太会频繁更换。",
  c7: "这家公司值得关注，是因为 AI 写代码越来越常见，但 AI 也可能顺手带进来一些不安全、不维护或许可证麻烦的东西。Mintvector 做的是帮工程团队检查这些风险。你可以把它想成代码仓库旁边的安全检查员：当 AI 或工程师引入一个开源库、一段代码或一个依赖时，它会提醒这个东西靠不靠谱、有没有漏洞、是不是没人维护。它的竞争力在于能不能嵌进开发者每天写代码的地方，比如 pull request、CI 或编辑器里；越早提醒，越不容易被忽略。",
  c8: "这家公司值得关注，是因为医疗机构人手紧，而很多沟通工作并不需要医生亲自做。RelayCare 做的是帮专科诊所自动跟进病人。比如病人做完检查或小手术后，诊所要提醒注意事项、询问恢复情况、安排复诊，还要在情况不对时叫工作人员介入。它更像一个诊所前台和护士之间的小助手，不负责诊断，只负责把该问的问到、该提醒的提醒到、异常情况交给人。它的竞争力在于医疗场景需要合规和谨慎，如果它能减少漏跟进、减少电话工作量，还不碰高风险诊断，就会比较容易落地。",
  c9: "这家公司值得关注，是因为越来越多品牌被要求说明自己的产品到底产生了多少碳排，但这件事对中型公司来说很麻烦。TraceGarden 帮食品饮料品牌追踪供应链排放。你可以把它想成一本会往上游追问的账本：一瓶饮料的排放不只来自工厂，还来自原料、包装、运输、冷链和供应商。它帮公司弄清楚问题主要出在哪里，哪些供应商或材料最该先改。它的竞争力在于行业模板和供应商数据，如果很多供应商愿意在它这里填数据，它就会比普通表格更有用。",
  c10: "这家公司值得关注，是因为很多公司正在让 AI 直接面对客户，而大家真正担心的是 AI 会不会乱答。PromptDesk 做的是 AI 客服的质检和监控。它不一定自己当客服，更像是坐在 AI 客服旁边的主管：看它有没有乱承诺、有没有漏掉投诉、什么时候该转人工、哪些问题总是答不好。它的竞争力在于评估体系和系统集成，如果它能接进 Zendesk、Intercom 这类客服工具，并持续告诉公司 AI 哪里做得不好，它就可能成为 AI 客服上线后的必备安全网。",
  p1: "这家公司值得关注，是因为制造业里一个很朴素的问题一直没解决好：人总是在变，但生产不能停。ShiftFoundry 做的是给工厂排班和培训用的软件。你可以把它想成一个很懂车间规则的班组长助手：它知道谁会操作哪台机器、谁还缺安全培训、谁今天能上哪条线、哪个新人还不能独立干活。它的竞争力在于理解一线工厂的限制，而不是只做一个普通日历；如果它能接入考勤、工资和培训记录，就会变成生产运营的一部分。",
  p2: "这家公司值得关注，是因为很多人都在收藏文章和链接，但真正消化掉的信息很少。Atlas Inbox 做的是把你存下来的内容变成可以读的研究简报。它像一个帮你整理书桌的小助手：你把文章、报告、网页丢进去，它帮你挑重点、归主题、提醒哪些最值得先看。它的竞争力在于个人化，如果它越来越懂你关心什么、哪些来源可信、哪些内容你已经看过，它就不只是摘要工具，而更像私人阅读助理。",
  p3: "这家公司值得关注，是因为保险理赔看起来枯燥，但里面有大量重复、容易出错、又必须留痕的工作。Northline Claims 做的是帮保险公司审核理赔材料。比如一个事故来了，审核员要看照片、描述、保单条款、历史记录和第三方报告，再判断还缺什么、能不能赔、要不要升级给专家。它像一个先把材料整理好的助手，让人少漏信息。它的竞争力在于懂条款、证据和审计记录，因为保险公司不能只要一个会聊天的 AI，而需要一个能解释、能追溯的流程工具。"
};

const readingStories: Record<string, string> = {
  r1: "这篇值得读，是因为它能帮你看懂为什么 AI 基础设施公司还会一批批冒出来。文章表面在讲 GPU、训练和推理成本，但真正重要的是：AI 公司花钱的地方已经变得很细，不只是“买几张显卡”这么简单。它们要考虑模型跑在哪里、什么时候跑、怎么省钱、怎么监控、怎么避免某个供应商太贵或太不稳定。读这篇的时候，可以把它想成一张 AI 公司背后水电煤账单的拆解图。看懂这张账单，你就更容易判断一家 AI infra 创业公司到底是在解决真痛点，还是只是在给热点换一个名字。",
  r2: "这篇值得读，是因为它解释了一个很容易被忽略的 B2B 问题：技术买家不是被一句漂亮口号打动的。一个卖给工程团队的产品，真正要通过的是信任测试。买家会问：文档清不清楚，接入要多久，坏了能不能回滚，权限怎么管，安全团队会不会卡住。文章讲 onboarding，其实讲的是技术产品怎样让客户更快相信“这东西真的能进我的系统”。如果你在看开发者工具、基础设施或安全类创业公司，这篇能帮你理解为什么有些产品看起来很强，但客户就是迟迟不敢用。",
  r3: "这篇值得读，是因为它能帮你区分两种垂直 AI 公司：一种只是把聊天框放进某个行业，另一种是真的进入了这个行业每天要做的事情。文章提醒你，早期垂直 AI 公司看起来常常很无聊，像是在处理表格、邮件、审批、客服、病人跟进、理赔材料这些杂事。但真正的价值也可能就在这里，因为这些杂事每天都发生，而且客户愿意为省时间、少出错付钱。读它的时候，不要只问模型厉不厉害，要问它有没有接进真实工作流、有没有拿到行业数据、有没有让客户少做一件麻烦事。",
  r4: "这篇值得读，是因为机器人创业公司最容易被演示视频误导。视频里机器人夹起一个东西，看起来很酷，但真实工厂里难的是：东西每批都不一样，摆放位置会变，夹具要换，工人要会维护，机器不能三天两头停。文章讲小批量制造的工程约束，能让你理解为什么很多机器人公司从 demo 到商业化会走很久。看完之后，你再看机器人创业公司，就不会只看它会不会动，而会看它部署快不快、便不便宜、换任务麻不麻烦、客户现场能不能稳定跑。",
  r5: "这篇值得读，是因为它把合规软件这种听起来很无聊的东西讲清楚了。合规不是简单填表，而是公司为了不出事，必须在日常流程里留下证据、审批、记录和解释。金融、医疗、供应链、政府这些行业尤其如此。文章的价值在于提醒你：有些创业方向不性感，但客户买它不是为了追潮流，而是为了降低风险、通过审计、少被罚款。读完你会更容易理解为什么很多看起来很普通的 B2B 软件，反而能有稳定收入。",
  r6: "这篇值得读，是因为它相当于给这个网站本身定规矩：看创业公司不能只看创始人自己怎么说，也不能看到一个发布页就当成事实。早期公司信息很少，很多东西都带营销味，所以更可靠的方法是看多个信号能不能互相印证：有没有产品发布，有没有真实客户，有没有融资或知名投资人，有没有技术社区讨论，有没有招聘，有没有代码或案例。读这篇的用处是，它会让你每天看新公司时更冷静，不会因为一句很会包装的话就误判一家公司。"
};

function companyStory(company: Company) {
  if (company.story) {
    return company.story;
  }

  if (companyStories[company.id]) {
    return companyStories[company.id];
  }

  return `${company.explanation ?? ""} ${company.moat ?? ""} 我会把它放进今天的列表，是因为${company.signals?.join("、") ?? "它有一些值得继续跟踪的公开信号"}这些信号放在一起看，说明它不只是一个普通新产品，而是在一个有人讨论、有人愿意付钱、也可能正在变重要的方向上冒出来。`;
}

function readingStory(item: ReadingItem) {
  if (item.story) {
    return item.story;
  }

  const baseId = item.id.split("-")[0];
  return readingStories[baseId] ?? `${item.narration ?? ""} ${item.whyRead ?? ""} ${item.context ?? ""}`;
}

function isRealLink(url?: string) {
  return Boolean(url) && !url.includes("example.com");
}

function App() {
  const [dailyFeeds, setDailyFeeds] = useState<DailyFeed[]>(fallbackFeeds);
  const [isRefreshing, setIsRefreshing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    capturePageview();
    const uninstallClickTracking = installGlobalClickTracking();

    fetch(`/api/feed?days=10&v=${feedVersion}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
        return response.json();
      })
      .then((feed: { days?: DailyFeed[] }) => {
        if (!cancelled && feed.days?.length) {
          setDailyFeeds(feed.days);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDailyFeeds(fallbackFeeds);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
      uninstallClickTracking();
    };
  }, []);

  return (
    <main className="page">
      {isRefreshing ? <p className="loadingText">正在读取今日内容...</p> : null}
      {dailyFeeds.map((day) => (
        <section className="dayFeed" key={day.date}>
          <div className="dayHead">
            <h2>{day.date}</h2>
          </div>

          <section className="section">
            <h3>值得关注的十家新公司</h3>
            <ol className="linkList">
              {day.companies.map((company, index) => (
                <li className="companyRow" key={company.id}>
                  <div className="rowNumber">{index + 1}</div>
                  <article>
                    <div className="rowTitle">
                      {isRealLink(company.url) ? (
                        <a className="companyName" href={company.url} target="_blank" rel="noreferrer" data-analytics-location="company">
                          {company.name}
                        </a>
                      ) : (
                        <span className="companyName">{company.name}</span>
                      )}
                    </div>
                    <p className="companyExplanation">{companyStory(company)}</p>
                  </article>
                </li>
              ))}
            </ol>
          </section>

          <section className="section readingSection">
            <h3>三篇当日阅读</h3>
            <ol className="readingList">
              {day.readings.map((item, index) => (
                <li className="readingRow" key={item.id}>
                  <div className="rowNumber">{index + 1}</div>
                  <article className="readingItem">
                    <h4>
                      {isRealLink(item.url) ? (
                        <a href={item.url} target="_blank" rel="noreferrer" data-analytics-event="writing_link_clicked" data-analytics-location="reading">
                          {item.title}
                        </a>
                      ) : (
                        <span>{item.title}</span>
                      )}
                    </h4>
                    <p>{readingStory(item)}</p>
                  </article>
                </li>
              ))}
            </ol>
          </section>
        </section>
      ))}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
