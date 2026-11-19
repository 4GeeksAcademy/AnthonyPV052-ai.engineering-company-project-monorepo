import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";

import {
  API_BASE,
  AUTH_SESSION_CLEARED_EVENT,
  AUTH_TOKEN_KEY,
  ApiError,
  apiFetch,
  authenticatedApiFetch,
  changePassword,
  clearToken,
  getCurrentUser,
  getStoredToken,
  login,
  registerAndLogin,
  requestPasswordReset,
  resetPassword,
  storeToken,
  updateCurrentUserProfile,
} from "../auth";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

const response = (status: number, body: unknown): MockResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const user = {
  id: "user-1",
  email: "person@example.com",
  role: "user" as const,
  profile: null,
};

let storage: Map<string, string>;
let dispatch: jest.Mock<(event: Event) => boolean>;

beforeEach(() => {
  storage = new Map();
  dispatch = jest.fn<(event: Event) => boolean>(() => true);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      dispatchEvent: dispatch,
    },
  });
  global.fetch = jest.fn<typeof fetch>();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (globalThis as { window?: unknown }).window;
});

describe("session token helpers", () => {
  test("reads, stores and clears a token while notifying the app", () => {
    expect(getStoredToken()).toBeNull();
    storeToken("jwt-token");
    expect(getStoredToken()).toBe("jwt-token");
    clearToken();
    expect(storage.has(AUTH_TOKEN_KEY)).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: AUTH_SESSION_CLEARED_EVENT }));
  });

  test("does not access browser storage during server rendering", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(getStoredToken()).toBeNull();
    expect(() => clearToken()).not.toThrow();
  });
});

describe("apiFetch", () => {
  test("returns successful JSON and adds JSON content type when sending a body", async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(200, { ok: true }) as Response);
    await expect(apiFetch("/example", { method: "POST", body: "{}" })).resolves.toEqual({ ok: true });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(API_BASE).toBeTruthy();
  });

  test.each([
    [400, "Revisa los datos ingresados y vuelve a intentarlo."],
    [401, "Tus datos de acceso no son válidos. Revísalos e inténtalo de nuevo."],
    [403, "No tienes permiso para realizar esta acción. Contacta con un administrador."],
    [404, "No encontramos la información solicitada. Actualiza la página e inténtalo de nuevo."],
    [409, "La solicitud entra en conflicto con los datos actuales. Revísalos e inténtalo de nuevo."],
    [503, "El servicio no está disponible ahora. Inténtalo de nuevo más tarde."],
    [418, "No se pudo completar la solicitud. Comprueba la conexión e inténtalo de nuevo."],
  ])("maps HTTP error %i to a stable ApiError", async (status, message) => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(status, {}) as Response);
    await expect(apiFetch("/example")).rejects.toMatchObject({ name: "ApiError", status, message });
  });

  test("converts network errors into a connection ApiError", async () => {
    global.fetch = jest.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    await expect(apiFetch("/example")).rejects.toMatchObject({ name: "ApiError", status: 0 });
  });
});

describe("authenticatedApiFetch", () => {
  test("sends the stored bearer token", async () => {
    storeToken("jwt-token");
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(200, user) as Response);
    await expect(authenticatedApiFetch("/private")).resolves.toEqual(user);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer jwt-token");
  });

  test("fails without a token and does not send a request", async () => {
    const fetch = jest.fn<typeof global.fetch>();
    global.fetch = fetch;
    await expect(authenticatedApiFetch("/private")).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });

  test("clears session when the API returns 401", async () => {
    storeToken("expired-token");
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(401, {}) as Response);
    await expect(authenticatedApiFetch("/private")).rejects.toBeInstanceOf(ApiError);
    expect(getStoredToken()).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: AUTH_SESSION_CLEARED_EVENT }));
  });
});

describe("auth operations", () => {
  test("login stores the access token", async () => {
    const token = { access_token: "jwt", token_type: "bearer", expires_in: 1800 };
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(200, token) as Response);
    await expect(login("person@example.com", "password123")).resolves.toEqual(token);
    expect(getStoredToken()).toBe("jwt");
  });

  test("login does not store a token after an API failure", async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(401, {}) as Response);
    await expect(login("person@example.com", "wrong")).rejects.toBeInstanceOf(ApiError);
    expect(getStoredToken()).toBeNull();
  });

  test("registerAndLogin registers before logging in", async () => {
    const fetch = jest.fn<typeof global.fetch>()
      .mockResolvedValueOnce(response(201, { id: "u" }) as Response)
      .mockResolvedValueOnce(response(200, { access_token: "jwt", token_type: "bearer", expires_in: 1800 }) as Response);
    global.fetch = fetch;
    await registerAndLogin({ email: "person@example.com", password: "password123", name: "Person" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toContain("/users");
    expect(fetch.mock.calls[1][0]).toContain("/auth/login");
  });

  test("does not attempt login when registration fails", async () => {
    const fetch = jest.fn<typeof global.fetch>().mockResolvedValue(response(409, {}) as Response);
    global.fetch = fetch;
    await expect(registerAndLogin({ email: "person@example.com", password: "password123" })).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("fetches current user and updates the profile through authenticated calls", async () => {
    storeToken("jwt");
    global.fetch = jest.fn<typeof fetch>()
      .mockResolvedValueOnce(response(200, user) as Response)
      .mockResolvedValueOnce(response(200, { id: "p", user_id: user.id, name: "New name", phone: null, address: null }) as Response);
    await expect(getCurrentUser()).resolves.toEqual(user);
    await expect(updateCurrentUserProfile({ name: "New name", phone: null, address: null })).resolves.toMatchObject({ name: "New name" });
  });

  test("sends forgot/reset/change password payloads and propagates failures", async () => {
    storeToken("jwt");
    const fetch = jest.fn<typeof global.fetch>()
      .mockResolvedValueOnce(response(200, {}) as Response)
      .mockResolvedValueOnce(response(200, {}) as Response)
      .mockResolvedValueOnce(response(200, {}) as Response);
    global.fetch = fetch;
    await requestPasswordReset("person@example.com");
    await resetPassword("reset-jwt", "newpass8");
    await changePassword("oldpass8", "newpass8");
    const bodies = fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies).toEqual([
      { email: "person@example.com" },
      { token: "reset-jwt", new_password: "newpass8" },
      { current_password: "oldpass8", new_password: "newpass8" },
    ]);

    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(400, {}) as Response);
    await expect(requestPasswordReset("bad@example.com")).rejects.toBeInstanceOf(ApiError);
  });
});
