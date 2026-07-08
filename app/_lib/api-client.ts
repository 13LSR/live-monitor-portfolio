import type {
  AuthStateResponse,
  ErrorResponse,
  LoginRequest,
  LoginResponse,
  MutationResponse,
  PublicGoodBatch,
  PublicSitesResponse,
  SitePayload,
} from "@/shared/contracts";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const errorBody = (await response.json()) as ErrorResponse;
      if (errorBody.error) {
        message = errorBody.error;
      }
    } catch {
      // Fall back to status-derived error message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getSites(options?: { includeHidden?: boolean }) {
  const params = new URLSearchParams();

  if (options?.includeHidden) {
    params.set("includeHidden", "1");
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<PublicSitesResponse>(`/sites${suffix}`);
}

export async function getPublicGood(): Promise<PublicGoodBatch> {
  try {
    const batch = await request<PublicGoodBatch>("/public-good");
    return isPublicGoodBatch(batch) ? batch : getPublicGoodFallbackBatch();
  } catch {
    return getPublicGoodFallbackBatch();
  }
}

export function getAuthState() {
  return request<AuthStateResponse>("/auth/me");
}

export function login(input: LoginRequest) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout() {
  return request<MutationResponse>("/auth/logout", {
    method: "POST",
  });
}

export function createSite(input: SitePayload) {
  return request<MutationResponse>("/sites", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSite(id: number, input: SitePayload) {
  return request<MutationResponse>(`/sites/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteSite(id: number) {
  return request<MutationResponse>(`/sites/${id}`, {
    method: "DELETE",
  });
}

function isPublicGoodBatch(value: unknown): value is PublicGoodBatch {
  if (!value || typeof value !== "object") {
    return false;
  }

  const batch = value as Partial<PublicGoodBatch>;
  return (
    batch.success === true &&
    Array.isArray(batch.items) &&
    batch.items.length === 5 &&
    batch.items.every(isPublicGoodPerson) &&
    typeof batch.sourceName === "string" &&
    typeof batch.sourceApi === "string" &&
    typeof batch.cachedAt === "string" &&
    typeof batch.cacheTtlSeconds === "number" &&
    typeof batch.isFallback === "boolean"
  );
}

function isPublicGoodPerson(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const person = value as Record<string, unknown>;
  return (
    typeof person.id === "string" &&
    typeof person.name === "string" &&
    typeof person.sex === "string" &&
    typeof person.birthTime === "string" &&
    typeof person.lostTime === "string" &&
    (typeof person.childPic === "string" || person.childPic === null) &&
    typeof person.lostPlace === "string" &&
    typeof person.childFeature === "string" &&
    (typeof person.detailUrl === "string" || person.detailUrl === null)
  );
}

export function getPublicGoodFallbackBatch(): PublicGoodBatch {
  return {
    success: true,
    items: [
      {
        id: "local-fallback-1",
        name: "公益寻亲信息",
        sex: "",
        birthTime: "",
        lostTime: "信息暂不可用",
        childPic: null,
        lostPlace: "公益公告备用数据",
        childFeature: "Worker 暂时不可用时，页面仍保留公益公告位置。",
        detailUrl: null,
      },
      {
        id: "local-fallback-2",
        name: "宝贝回家线索",
        sex: "",
        birthTime: "",
        lostTime: "信息暂不可用",
        childPic: null,
        lostPlace: "公益公告备用数据",
        childFeature: "请稍后刷新查看真实公益寻亲信息。",
        detailUrl: null,
      },
      {
        id: "local-fallback-3",
        name: "寻亲公告",
        sex: "",
        birthTime: "",
        lostTime: "信息暂不可用",
        childPic: null,
        lostPlace: "公益公告备用数据",
        childFeature: "备用内容只用于保护首页稳定渲染。",
        detailUrl: null,
      },
      {
        id: "local-fallback-4",
        name: "公益提醒",
        sex: "",
        birthTime: "",
        lostTime: "信息暂不可用",
        childPic: null,
        lostPlace: "公益公告备用数据",
        childFeature: "数据恢复后会展示 Worker 返回的公益公告。",
        detailUrl: null,
      },
      {
        id: "local-fallback-5",
        name: "公共告示",
        sex: "",
        birthTime: "",
        lostTime: "信息暂不可用",
        childPic: null,
        lostPlace: "公益公告备用数据",
        childFeature: "公益模块故障不会影响作品列表。",
        detailUrl: null,
      },
    ],
    contacts: null,
    sourceName: "本地备用公益公告",
    sourceApi: "",
    cachedAt: new Date(0).toISOString(),
    cacheTtlSeconds: 0,
    isFallback: true,
    message: "公益公告暂时使用本地备用数据。",
  };
}
