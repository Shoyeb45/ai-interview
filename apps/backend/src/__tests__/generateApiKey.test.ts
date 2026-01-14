jest.mock("../database/repositories/ApiKeyRepo", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock("../database", () => ({
  __esModule: true,
  connectDB: jest.fn(() => Promise.resolve()),
}));

import ApiKeyRepo from "../database/repositories/ApiKeyRepo";

describe("createApiKey", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns a 64-char hex key when ApiKeyRepo.create succeeds", async () => {
    (ApiKeyRepo as any).create.mockResolvedValue({ id: 1 });
    const { createApiKey } = await import("../helpers/generateApiKey");
    const key = await createApiKey(["test"], ["GENERAL" as any]);
    expect(typeof key).toBe("string");
    expect(key.length).toBe(64);
    expect((ApiKeyRepo as any).create).toHaveBeenCalledWith(
      expect.any(String),
      ["test"],
      ["GENERAL"],
      1
    );
  });

  it("throws when ApiKeyRepo.create returns falsy", async () => {
    (ApiKeyRepo as any).create.mockResolvedValue(null);
    const { createApiKey } = await import("../helpers/generateApiKey");
    await expect(createApiKey(["x"], ["GENERAL" as any])).rejects.toThrow(
      "Failed to generate API Key."
    );
  });
});
