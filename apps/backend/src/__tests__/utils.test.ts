import { getUserData } from "../core/utils";

describe("getUserData", () => {
  it("picks id, name, roles, email from user object", async () => {
    const user = {
      id: 1,
      name: "Sofikul",
      roles: ["admin"],
      email: "sofikul@example.com",
      password: "secret",
      other: "value",
    } as any;

    const data = await getUserData(user);
    expect(data).toEqual({
      id: 1,
      name: "Sofikul",
      roles: ["admin"],
      email: "sofikul@example.com",
    });
  });
});
