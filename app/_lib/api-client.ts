import type {
  AuthStateResponse,
  ErrorResponse,
  LoginRequest,
  LoginResponse,
  MutationResponse,
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
