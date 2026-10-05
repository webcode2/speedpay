import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { completeTask } from "@/services/task-service";

type Params = { params: Promise<{ id: string }> };

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as {
      stars?: unknown;
      comment?: unknown;
    };
    return apiSuccess({
      result: await completeTask({
        userId: user.id,
        taskItemId: id,
        stars: body.stars,
        comment: body.comment,
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
