import { generateLiveFeed } from "../scripts/update-data.mjs";

const LATEST_FEED_PATH = "feeds/latest.json";
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
let storedFeedCache = null;

export const config = {
  maxDuration: 60
};

export default async function handler(request, response) {
  try {
    const url = new URL(request.url, "https://startup-radar.local");
    const days = Number(url.searchParams.get("days") || "14");
    const requestedDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 14) : 14;
    const refresh = url.searchParams.get("refresh") === "1";

    if (!refresh) {
      const storedFeed = await readStoredFeed();
      if (storedFeed) {
        setFeedCacheHeaders(response);
        response.status(200).json(limitFeedDays(storedFeed, requestedDays));
        return;
      }
    }

    const feed = await generateLiveFeed({
      daysBack: requestedDays
    });
    const aiDays = Number(url.searchParams.get("aiDays") || "1");
    const useAi = url.searchParams.get("ai") !== "0";

    if (useAi && process.env.DEEPSEEK_API_KEY) {
      await enrichFeedWithDeepSeek(feed, {
        days: Number.isFinite(aiDays) ? Math.min(Math.max(aiDays, 1), requestedDays) : requestedDays
      });
    }

    setFeedCacheHeaders(response);
    response.status(200).json(feed);
  } catch (error) {
    response.status(500).json({
      error: "Failed to generate feed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function enrichFeedWithDeepSeek(feed, options = { days: 1, strict: false }) {
  const targetDays = feed.days.slice(0, options.days);

  await Promise.all(
    targetDays.map(async (day) => {
      try {
        const stories = await generateCompleteStories(day.date, "company", day.companies, generateCompanyStories);
        for (const company of day.companies) {
          company.story = normalizeGeneratedStory(stories[company.id], [company.name]);
        }
        const readingStories = await generateCompleteStories(day.date, "reading", day.readings, generateReadingStories);
        for (const reading of day.readings) {
          reading.story = readingStories[reading.id];
        }
      } catch (error) {
        if (options.strict) throw error;
        console.warn(`DeepSeek skipped for ${day.date}: ${error instanceof Error ? error.message : String(error)}`);
      }
    })
  );
}

async function generateCompleteStories(date, type, items, generator) {
  const stories = {};
  let remaining = items;

  for (let attempt = 1; attempt <= 3 && remaining.length; attempt += 1) {
    Object.assign(stories, await generator(date, remaining));
    remaining = items.filter((item) => !stories[item.id]);
    if (remaining.length && attempt < 3) {
      console.warn(`DeepSeek ${type} retry ${attempt}/3 for ${date}: ${remaining.length} missing`);
    }
  }

  if (remaining.length) {
    const labels = remaining.map((item) => item.name || item.title || item.id);
    throw new Error(`DeepSeek ${type} output missing for ${date}: ${labels.join(", ")}`);
  }
  return stories;
}

export async function readStoredFeed(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  if (!forceRefresh && storedFeedCache?.expiresAt > Date.now()) return storedFeedCache.feed;
  if (!hasBlobStorage()) return null;

  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({
      prefix: LATEST_FEED_PATH,
      limit: 1
    });
    const blob = blobs.find((item) => item.pathname === LATEST_FEED_PATH);
    if (!blob?.url) return null;

    const result = await fetch(blob.url);
    if (!result.ok) {
      throw new Error(`Blob fetch ${result.status}`);
    }

    const text = await result.text();
    return cacheStoredFeed(JSON.parse(text));
  } catch (error) {
    console.warn(`Stored feed skipped: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function writeStoredFeed(feed) {
  if (!hasBlobStorage()) {
    throw new Error("BLOB_READ_WRITE_TOKEN or Vercel Blob OIDC env vars are required");
  }

  const { put } = await import("@vercel/blob");
  const body = `${JSON.stringify(normalizeFeedText(feed), null, 2)}\n`;
  const today = feed.days?.[0]?.date || new Date().toISOString().slice(0, 10);
  const options = {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60
  };

  const latest = await put(LATEST_FEED_PATH, body, options);
  await put(`feeds/${today}.json`, body, options);
  cacheStoredFeed(JSON.parse(body));
  return latest;
}

function hasBlobStorage() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
  );
}

function cacheStoredFeed(feed) {
  const normalized = normalizeFeedText(feed);
  storedFeedCache = {
    feed: normalized,
    expiresAt: Date.now() + FEED_CACHE_TTL_MS
  };
  return normalized;
}

function setFeedCacheHeaders(response) {
  response.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
}

function limitFeedDays(feed, count) {
  return normalizeFeedText({
    ...feed,
    days: (feed.days || []).slice(0, count)
  });
}

async function generateReadingStories(date, readings) {
  const payload = readings.map((reading) => ({
    id: reading.id,
    title: reading.title,
    source: reading.source || "",
    topic: reading.topic || "",
    url: reading.url || "",
    existingSummary: truncate(reading.story || "", 500)
  }));

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.66,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是一个中文阅读助手，为产品、策略、设计和公司建设文章写旁白。你只基于标题、来源、主题和已有摘要写作，不假装读过全文细节。输出严格 JSON。不要使用破折号；需要解释或转折时用冒号、逗号或句号。"
        },
        {
          role: "user",
          content: JSON.stringify({
            date,
            task:
              "为每篇文章写一段中文旁白。每段 130 到 190 个中文字左右，一个自然段。不要直接概括文章内容，要像阅读助手先把读者带进背景：先用一两句铺垫这类问题为什么会出现，或者一个普通团队、用户、产品经理、设计师会在什么时候遇到它；然后自然说明为什么这篇值得读；最后给一个具体阅读角度，例如读的时候看作者如何拆问题、如何判断取舍、如何发现流程里真正卡住的地方。语气要娓娓道来，像在给没有背景的人解释，不要像课程简介或知识点摘要。少用抽象名词，不要堆“系统协作、接触点、支持流程、经典工具、复杂服务流程”这类词；如果必须用，要先用场景解释。三篇之间开头和句式要明显不同。不要写“这篇更像常青阅读”。不要写“不是追新闻”。不要编造文章里没有的具体案例。",
            output:
              "返回 JSON：{\"items\":[{\"id\":\"输入 id\",\"story\":\"中文旁白\"}]}。必须覆盖所有输入 id，不要增加别的字段。",
            readings: payload
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek reading ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek reading returned empty content");
  }

  const parsed = JSON.parse(stripCodeFence(content));
  const result = {};
  for (const item of parsed.items || []) {
    if (item.id && item.story) {
      result[item.id] = normalizeGeneratedStory(item.story);
    }
  }
  return result;
}

async function generateCompanyStories(date, companies) {
  const payload = companies.map((company) => ({
    id: company.id,
    name: company.name,
    signals: {
      batch: company.batch || "",
      location: company.location || "",
      source: company.source?.join(", ") || "",
      isHiring: Boolean(company.isHiring),
      teamSize: company.teamSize || 0,
      tags: company.tags?.slice(0, 4) || [],
      oneLiner: company.originalOneLiner || ""
    },
    description: truncate(company.originalDescription || company.originalOneLiner || "", 900)
  }));

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.62,
      max_tokens: 4600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是一个给中文读者解释北美创业公司的编辑。你必须只基于输入资料写作，不编造融资、客户、创始人背景、论文、收入或数据。输出严格 JSON。不要使用破折号；需要解释或转折时用冒号、逗号或句号。"
        },
        {
          role: "user",
          content: JSON.stringify({
            date,
            task:
              "为每家公司写一段中文介绍。每段 160 到 240 个中文字左右，只有一个自然段，不要分点、不要小标题。第一句先用自然中文交代它所在的行业或方向，例如“这是做医疗后台运营的公司”或“这家公司切的是金融交易基础设施”，但不要每段都用同一个句式。第二句或第三句必须让读者进入一个具体角色和工作场景，必须出现一个明确角色，例如诊所运营负责人、风控分析师、仓库主管、工厂质检员、工程负责人、销售主管、会计、设计负责人、保险理赔员、研究员、会议很多的咨询顾问、运动用户等；场景要像“这个人今天遇到了什么麻烦”，不能只写行业概述或产品功能。可以用“假如你是……”“想象你正在……”“如果你负责……”“一个……每天会……”等不同句式，但不要连续重复。后面再写它帮这个角色解决什么麻烦，以及为什么值得关注。为什么值得关注只能使用输入里的真实信号，例如 YC 批次、非 YC 来源、正在招聘、团队人数、客户、收入、论文、产品发布等；如果输入没有这些信号，就说明场景本身为什么值得看。遇到智能硬件或可穿戴设备，要自然说明它为什么不只是一个手机应用，而是把能力放进设备、传感器或随身场景里。语气像给外行娓娓道来，避免大量冒号、顿号和模板句。除公司名、产品名、Claude Code、Codex、Slack、GitHub、NeurIPS 等必要名词外，不要使用英文；AI 写成人工智能，AI agent 写成智能体，API 写成接口，ERP 写成企业管理系统，VLM 写成视觉语言模型，workshop 写成研讨会，YC Summer/Winter/Spring/Fall 写成 YC 夏季/冬季/春季/秋季。不要说“公开资料里能看到”。不要写“是否真的厉害还要继续看”。不要编造创始人背景、收入、客户、融资或论文。",
            output:
              "返回 JSON：{\"items\":[{\"id\":\"输入 id\",\"story\":\"中文介绍\"}]}。必须覆盖所有输入 id，不要增加别的字段。",
            companies: payload
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek returned empty content");
  }

  const parsed = JSON.parse(stripCodeFence(content));
  const result = {};
  for (const item of parsed.items || []) {
    if (item.id && item.story) {
      result[item.id] = String(item.story).trim();
    }
  }
  return result;
}

function normalizeGeneratedStory(value, protectedTerms = []) {
  const replacements = protectedTerms
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .map((term, index) => ({ term, token: `__PROTECTED_TERM_${index}__` }));
  let protectedValue = String(value);
  for (const { term, token } of replacements) protectedValue = protectedValue.split(term).join(token);

  let normalized = protectedValue
    .replace(/\s+/g, " ")
    .replace(/\s*[—–]+\s*/g, "：")
    .replace(/：+/g, "：")
    .replace(/\bAI agents?\b/gi, "智能体")
    .replace(/\bAI代理\b/g, "智能体")
    .replace(/\bAI\b/g, "人工智能")
    .replace(/\bAPI\b/g, "接口")
    .replace(/\bERP\b/g, "企业管理系统")
    .replace(/\bVLMs?\b/g, "视觉语言模型")
    .replace(/\bworkshop\b/gi, "研讨会")
    .replace(/YC Summer (\d{4})/g, "YC 夏季 $1 批次")
    .replace(/YC Winter (\d{4})/g, "YC 冬季 $1 批次")
    .replace(/YC Spring (\d{4})/g, "YC 春季 $1 批次")
    .replace(/YC Fall (\d{4})/g, "YC 秋季 $1 批次")
    .replace(/YC 夏季 (\d{4})批次/g, "YC 夏季 $1 批次")
    .replace(/YC 冬季 (\d{4})批次/g, "YC 冬季 $1 批次")
    .replace(/YC 春季 (\d{4})批次/g, "YC 春季 $1 批次")
    .replace(/YC 秋季 (\d{4})批次/g, "YC 秋季 $1 批次")
    .trim();

  for (const { term, token } of replacements) normalized = normalized.split(token).join(term);
  return normalized;
}

function normalizeFeedText(feed) {
  return {
    ...feed,
    days: (feed.days || []).map((day) => ({
      ...day,
      companies: (day.companies || []).map((company) => ({
        ...company,
        story: company.story ? normalizeGeneratedStory(company.story, [company.name]) : company.story,
        explanation: company.explanation ? normalizeGeneratedStory(company.explanation, [company.name]) : company.explanation
      })),
      readings: (day.readings || []).map((reading) => ({
        ...reading,
        story: reading.story ? normalizeGeneratedStory(reading.story) : reading.story,
        narration: reading.narration ? normalizeGeneratedStory(reading.narration) : reading.narration
      }))
    }))
  };
}

function compact(values) {
  return values.filter((value) => typeof value === "string" && value.trim().length > 0);
}

function truncate(value, maxLength) {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function stripCodeFence(value) {
  return String(value)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
