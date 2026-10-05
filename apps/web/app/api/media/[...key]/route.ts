import { handleRouteError } from "@/auth/http";
import { AppError } from "@/lib/app-error";
import { getStorage } from "@/storage";

type Params = { params: Promise<{ key: string[] }> };

/** Only non-sensitive image folders; KYC documents share this storage and must never be served here. */
const PUBLIC_PREFIXES = ["packages/banners/", "tasks/images/", "receipts/"];

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { key: parts } = await params;
    const key = parts.join("/");
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    if (
      key.includes("..") ||
      !PUBLIC_PREFIXES.some((p) => key.startsWith(p)) ||
      !CONTENT_TYPES[ext]
    ) {
      throw new AppError("NOT_FOUND", "Not found.", 404);
    }
    let body: Buffer;
    try {
      body = await getStorage().get(key);
    } catch {
      throw new AppError("NOT_FOUND", "Not found.", 404);
    }
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext]!,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
