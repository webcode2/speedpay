export type ApiErrorCode =
  | "INTERNAL_ERROR"
  | "DATABASE_UNAVAILABLE"
  | "VALIDATION_ERROR";

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
