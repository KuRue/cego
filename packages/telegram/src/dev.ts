import type { VerifiedTelegramInitData } from "./init-data";

export function getDevTelegramInitData(): VerifiedTelegramInitData {
  return {
    authDate: new Date(),
    queryId: "dev-query",
    startParam: "dev",
    user: {
      id: 100000001,
      first_name: "cego",
      last_name: "Developer",
      username: "cego_dev",
      photo_url: undefined,
    },
    raw: {
      auth_date: String(Math.floor(Date.now() / 1000)),
      query_id: "dev-query",
      start_param: "dev",
    },
  };
}

