import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import {
  changeWithdrawalPin,
  getPinStatus,
  requestPinResetOtp,
  resetWithdrawalPinWithOtp,
  setWithdrawalPin,
} from "@/services/withdrawal-pin-service";

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return apiSuccess(await getPinStatus(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as {
      pin?: string;
      currentPin?: string;
      newPin?: string;
      action?: string;
      password?: string;
      otp?: string;
    };

    if (body.action === "request-reset") {
      return apiSuccess(await requestPinResetOtp(user.id));
    }

    if (body.action === "reset") {
      if (!body.password || !body.otp || !body.newPin) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Account password, email OTP, and new PIN are required.",
          400,
        );
      }
      return apiSuccess(
        await resetWithdrawalPinWithOtp({
          userId: user.id,
          password: body.password,
          otp: body.otp,
          newPin: body.newPin,
        }),
      );
    }

    if (body.action === "change") {
      if (!body.currentPin || !body.newPin) {
        throw new AppError(
          "VALIDATION_ERROR",
          "currentPin and newPin are required.",
          400,
        );
      }
      return apiSuccess(
        await changeWithdrawalPin(user.id, body.currentPin, body.newPin),
      );
    }

    if (!body.pin) {
      throw new AppError("VALIDATION_ERROR", "pin is required.", 400);
    }
    return apiSuccess(await setWithdrawalPin(user.id, body.pin));
  } catch (error) {
    return handleRouteError(error);
  }
}

