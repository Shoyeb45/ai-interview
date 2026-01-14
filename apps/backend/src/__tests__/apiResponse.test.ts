import {
  NotFoundResponse,
  AccessTokenErrorResponse,
} from "../core/ApiResponse";
import {
  NotFoundError,
  InternalError,
  ApiError,
} from "../core/ApiError";

function makeRes() {
  const headers: Record<string, string[]> = {};
  const res: any = {
    append: (k: string, v: string) => {
      headers[k] = headers[k] || [];
      headers[k].push(v);
    },
    statusCode: 0,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
  };
  return { res, headers } as const;
}

describe("ApiResponse and ApiError integration", () => {
  it("NotFoundResponse sets 404 and returns sanitized body", () => {
    const { res } = makeRes();
    const resp = new NotFoundResponse("nope");
    resp.send(res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toBeDefined();
    expect(res.body.message).toBe("nope");
    expect(res.body).not.toHaveProperty("status");
  });

  it("AccessTokenErrorResponse appends instruction header and returns 401", () => {
    const { res, headers } = makeRes();
    const resp = new AccessTokenErrorResponse("bad");
    resp.send(res);
    expect(res.statusCode).toBe(401);
    expect(headers.instruction).toBeTruthy();
  });

  it("ApiError.handle maps NotFoundError to 404", () => {
    const { res } = makeRes();
    ApiError.handle(new NotFoundError("x"), res as any);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("x");
  });

  it("ApiError.handle maps InternalError to 500", () => {
    const { res } = makeRes();
    ApiError.handle(new InternalError("oops"), res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("oops");
  });
});
