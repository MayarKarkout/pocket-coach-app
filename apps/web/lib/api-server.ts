import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function apiServerFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(session ? { Cookie: `session=${session.value}` } : {}),
    },
  });
}
