export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
  meta: Record<string, unknown>;
}

export const createResponse = <T>(
  message: string,
  data: T | null = null,
  meta: Record<string, unknown> = {},
  errors: string[] = [],
): ApiResponse<T> => ({
  success: errors.length === 0,
  message,
  data,
  errors,
  meta,
});

export const sendSuccess = <T>(
  res: { status: (code: number) => { json: (body: ApiResponse<T>) => unknown } },
  message: string,
  data: T | null = null,
  meta: Record<string, unknown> = {},
) => res.status(200).json(createResponse(message, data, meta));
