export type ApiErrorCode =
  | "INTERNAL_ERROR"
  | "DATABASE_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "UNAUTHORIZED"
  | "INVALID_RESET_TOKEN"
  | "FORBIDDEN"
  | "PROFILE_INCOMPLETE"
  | "VERIFICATION_INVALID_STATE"
  | "NOT_FOUND"
  | "KYC_REQUIRED"
  | "INVALID_STATE";

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
