import type { Env } from "./auth.ts";
import type {
  PublicGoodBatch,
  PublicGoodContacts,
  PublicGoodPerson,
} from "../../shared/contracts";

interface PublicGoodCacheEntry {
  batch: PublicGoodBatch;
  expiresAt: number;
  key: string;
}

interface ThirdPartyPublicGoodResponse {
  success?: boolean;
  data?: unknown;
  contacts?: {
    consult_mail?: unknown;
    tel?: unknown;
  };
  name?: unknown;
}

interface PublicGoodBatchOptions {
  allowLocalSampleFallback?: boolean;
}

const PUBLIC_GOOD_SOURCE_API = "https://api.isoyu.com/gy/api.php";
const DEFAULT_CACHE_TTL_SECONDS = 21600;
const MAX_REFRESH_REQUESTS = 8;
const TARGET_BATCH_SIZE = 5;

let cachedPublicGoodBatch: PublicGoodCacheEntry | null = null;

export async function handlePublicGood(request: Request, env: Env) {
  if (request.method !== "GET") {
    return Response.json(
      { success: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  const batch = await getPublicGoodBatch(env, {
    allowLocalSampleFallback: isLocalDevRequest(request),
  });
  return Response.json(batch);
}

export async function getPublicGoodBatch(
  env: Env,
  options: PublicGoodBatchOptions = {}
): Promise<PublicGoodBatch> {
  const now = Date.now();
  const ttlSeconds = getCacheTtlSeconds(env);
  const cacheKey = getPublicGoodCacheKey(env, options);

  if (
    cachedPublicGoodBatch &&
    cachedPublicGoodBatch.key === cacheKey &&
    cachedPublicGoodBatch.expiresAt > now
  ) {
    return cachedPublicGoodBatch.batch;
  }

  const previousBatch =
    cachedPublicGoodBatch?.key === cacheKey ? cachedPublicGoodBatch.batch : null;
  const seenIds = new Set<string>();
  const items: PublicGoodPerson[] = [];
  let contacts: PublicGoodContacts | null = previousBatch?.contacts ?? null;
  let sourceName = previousBatch?.sourceName ?? "姬长信API";
  let usedLocalSample = false;

  const fixtureResponses = parsePublicGoodFixtureResponses(
    env.PUBLIC_GOOD_FIXTURE_JSON
  );

  if (fixtureResponses) {
    const fixtureResult = appendThirdPartyResponses(
      items,
      fixtureResponses,
      seenIds,
      contacts,
      sourceName
    );
    contacts = fixtureResult.contacts;
    sourceName = fixtureResult.sourceName;
  } else {
    for (
      let requestCount = 0;
      requestCount < MAX_REFRESH_REQUESTS && items.length < TARGET_BATCH_SIZE;
      requestCount += 1
    ) {
      try {
        const response = await fetch(PUBLIC_GOOD_SOURCE_API);

        if (!response.ok) {
          continue;
        }

        const raw = (await response.json()) as ThirdPartyPublicGoodResponse;

        const liveResult = appendThirdPartyResponses(
          items,
          [raw],
          seenIds,
          contacts,
          sourceName
        );
        contacts = liveResult.contacts;
        sourceName = liveResult.sourceName;
      } catch {
        continue;
      }
    }
  }

  const primaryItemCount = items.length;

  if (items.length < TARGET_BATCH_SIZE && previousBatch) {
    appendUniqueItems(items, previousBatch.items, seenIds);
  }

  if (items.length < TARGET_BATCH_SIZE && options.allowLocalSampleFallback) {
    const appendedLocalSample = appendUniqueItems(
      items,
      documentedPublicGoodSampleItems,
      seenIds
    );

    if (appendedLocalSample) {
      usedLocalSample = true;
      contacts = contacts ?? documentedPublicGoodSampleContacts;

      if (primaryItemCount === 0) {
        sourceName = "姬长信API 文档示例";
      }
    }
  }

  if (items.length < TARGET_BATCH_SIZE) {
    appendUniqueItems(items, fallbackPublicGoodItems, seenIds);
  }

  const batch: PublicGoodBatch = {
    success: true,
    items: items.slice(0, TARGET_BATCH_SIZE),
    contacts,
    sourceName,
    sourceApi: PUBLIC_GOOD_SOURCE_API,
    cachedAt: new Date(now).toISOString(),
    cacheTtlSeconds: ttlSeconds,
    isFallback: primaryItemCount < TARGET_BATCH_SIZE,
    ...(primaryItemCount < TARGET_BATCH_SIZE
      ? {
          message: usedLocalSample
            ? "本地验证正在使用 API 文档示例；真实上游恢复后会自动展示实时公益公告。"
            : "公益公告暂时使用缓存或本地备用数据。",
        }
      : {}),
  };

  cachedPublicGoodBatch = {
    batch,
    expiresAt: now + ttlSeconds * 1000,
    key: cacheKey,
  };

  return batch;
}

function appendThirdPartyResponses(
  target: PublicGoodPerson[],
  responses: ThirdPartyPublicGoodResponse[],
  seenIds: Set<string>,
  contacts: PublicGoodContacts | null,
  sourceName: string
) {
  let nextContacts = contacts;
  let nextSourceName = sourceName;

  for (const raw of responses) {
    if (target.length >= TARGET_BATCH_SIZE || raw.success !== true) {
      continue;
    }

    const item = normalizePublicGoodItem(raw.data);

    if (!item || seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    target.push(item);
    nextContacts = normalizeContacts(raw.contacts) ?? nextContacts;
    nextSourceName = normalizeText(raw.name, 40) || nextSourceName;
  }

  return {
    contacts: nextContacts,
    sourceName: nextSourceName,
  };
}

function appendUniqueItems(
  target: PublicGoodPerson[],
  candidates: PublicGoodPerson[],
  seenIds: Set<string>
) {
  let appended = false;

  for (const item of candidates) {
    if (target.length >= TARGET_BATCH_SIZE) {
      return appended;
    }

    if (seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    target.push(item);
    appended = true;
  }

  return appended;
}

function getCacheTtlSeconds(env: Env) {
  const configured = Number(env.PUBLIC_GOOD_CACHE_TTL_SECONDS);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_CACHE_TTL_SECONDS;
}

function getPublicGoodCacheKey(env: Env, options: PublicGoodBatchOptions) {
  const fixtureJson = env.PUBLIC_GOOD_FIXTURE_JSON?.trim();

  if (fixtureJson) {
    return `fixture:${fixtureJson}`;
  }

  return options.allowLocalSampleFallback ? "live:local-sample" : "live";
}

function isLocalDevRequest(request: Request) {
  try {
    const hostname = new URL(request.url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function parsePublicGoodFixtureResponses(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    const responses = Array.isArray(parsed) ? parsed : [parsed];
    return responses.filter(isThirdPartyPublicGoodResponse);
  } catch {
    return null;
  }
}

function isThirdPartyPublicGoodResponse(
  value: unknown
): value is ThirdPartyPublicGoodResponse {
  return Boolean(value && typeof value === "object");
}

function normalizePublicGoodItem(raw: unknown): PublicGoodPerson | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = normalizeText(record.id, 80);
  const name = normalizeText(record.name, 40);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    sex: normalizeText(record.sex, 20),
    birthTime: normalizeText(record.birth_time, 40),
    lostTime: normalizeText(record.lost_time, 40),
    childPic: normalizeHttpsUrl(record.child_pic),
    lostPlace: normalizeText(record.lost_place, 120),
    childFeature: normalizeText(record.child_feature, 240),
    detailUrl: normalizeHttpsUrl(record.url),
  };
}

function normalizeContacts(
  raw: ThirdPartyPublicGoodResponse["contacts"]
): PublicGoodContacts | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  return {
    consultMail: normalizeText(raw.consult_mail, 80),
    tel: normalizeText(raw.tel, 40),
  };
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeHttpsUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const documentedPublicGoodSampleContacts: PublicGoodContacts = {
  consultMail: "baobeihuijia@yeah.net",
  tel: "0435-3338090",
};

const documentedPublicGoodSampleItems: PublicGoodPerson[] = [
  {
    id: "448061",
    name: "李瑾怡",
    sex: "女",
    birthTime: "2004年02月17日",
    lostTime: "2020年01月01日",
    childPic: null,
    lostPlace: "湖北省荆州市监利县容城镇",
    childFeature: "API 文档示例数据。真实上游可用时会显示宝贝回家寻子网的实时公益信息。",
    detailUrl: null,
  },
];

const fallbackPublicGoodItems: PublicGoodPerson[] = [
  {
    id: "fallback-1",
    name: "公益寻亲信息",
    sex: "",
    birthTime: "",
    lostTime: "信息暂不可用",
    childPic: null,
    lostPlace: "公益公告备用数据",
    childFeature: "第三方接口暂时不可用时，页面仍保留公益公告位置。",
    detailUrl: null,
  },
  {
    id: "fallback-2",
    name: "宝贝回家线索",
    sex: "",
    birthTime: "",
    lostTime: "信息暂不可用",
    childPic: null,
    lostPlace: "公益公告备用数据",
    childFeature: "请稍后刷新查看来自宝贝回家寻子网的真实信息。",
    detailUrl: null,
  },
  {
    id: "fallback-3",
    name: "寻亲公告",
    sex: "",
    birthTime: "",
    lostTime: "信息暂不可用",
    childPic: null,
    lostPlace: "公益公告备用数据",
    childFeature: "备用内容仅用于保护首页稳定渲染。",
    detailUrl: null,
  },
  {
    id: "fallback-4",
    name: "公益提醒",
    sex: "",
    birthTime: "",
    lostTime: "信息暂不可用",
    childPic: null,
    lostPlace: "公益公告备用数据",
    childFeature: "真实数据恢复后，Worker 会按缓存周期更新公告。",
    detailUrl: null,
  },
  {
    id: "fallback-5",
    name: "公共告示",
    sex: "",
    birthTime: "",
    lostTime: "信息暂不可用",
    childPic: null,
    lostPlace: "公益公告备用数据",
    childFeature: "公益模块故障不会影响作品列表和首页访问。",
    detailUrl: null,
  },
];
