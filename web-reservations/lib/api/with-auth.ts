import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, requireBranchAccess } from "./auth";
import type { AuthContext } from "./types";

type RouteHandler<P> = (
  req: NextRequest,
  ctx: { auth: AuthContext; params: P }
) => Promise<Response> | Response;

type Options = {
  ownerOnly?: boolean;
  // branchScoped: extracts branchId from `?branchId=` query OR from JSON body
  // (POST/PATCH/PUT). If extracted, runs requireBranchAccess. If branchScoped
  // is true and branchId is absent, returns 400.
  branchScoped?: boolean;
};

export function withAuth<P = Record<string, string>>(
  handler: RouteHandler<P>,
  opts: Options = {}
): (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response> {
  return async (req, ctx) => {
    const authOrError = await requireAuth(req);
    if (authOrError instanceof NextResponse) return authOrError;
    const auth = authOrError;

    if (opts.ownerOnly && auth.role !== "OWNER") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Owner only" } },
        { status: 403 }
      );
    }

    if (opts.branchScoped) {
      const url = new URL(req.url);
      let branchId: string | undefined =
        url.searchParams.get("branchId") ?? undefined;

      if (
        !branchId &&
        (req.method === "POST" ||
          req.method === "PATCH" ||
          req.method === "PUT")
      ) {
        // Try body; clone so the handler can re-read the original request.
        try {
          const cloned = req.clone();
          const body = (await cloned.json()) as unknown;
          if (
            body &&
            typeof body === "object" &&
            "branchId" in body &&
            typeof (body as { branchId: unknown }).branchId === "string"
          ) {
            branchId = (body as { branchId: string }).branchId;
          }
        } catch {
          /* not JSON body */
        }
      }

      if (!branchId) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "branchId required" } },
          { status: 400 }
        );
      }

      const branchOrError = await requireBranchAccess(req, branchId);
      if (branchOrError instanceof NextResponse) return branchOrError;
    }

    const params = await ctx.params;
    return handler(req, { auth, params });
  };
}
