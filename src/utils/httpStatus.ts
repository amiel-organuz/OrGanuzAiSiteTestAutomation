/**
 * Named HTTP status-code constants + range predicates for the API / contract suites.
 *
 * Replaces bare numeric literals (`expect(res.status()).toBe(401)`) with self-documenting
 * names (`toBe(HttpStatus.UNAUTHORIZED)`) so assertions read as intent, not magic numbers.
 * A frozen `class` of `static readonly` members — used as values, never instantiated.
 */
export class HttpStatus {
  // 2xx success
  static readonly OK = 200;
  static readonly CREATED = 201;
  static readonly NO_CONTENT = 204;

  // 3xx redirection
  static readonly MOVED_PERMANENTLY = 301;
  static readonly FOUND = 302;

  // 4xx client error
  static readonly BAD_REQUEST = 400;
  static readonly UNAUTHORIZED = 401;
  static readonly FORBIDDEN = 403;
  static readonly NOT_FOUND = 404;
  static readonly METHOD_NOT_ALLOWED = 405;
  static readonly CONFLICT = 409;
  static readonly UNPROCESSABLE_ENTITY = 422;
  static readonly TOO_MANY_REQUESTS = 429;

  // 5xx server error
  static readonly INTERNAL_SERVER_ERROR = 500;
  static readonly BAD_GATEWAY = 502;
  static readonly SERVICE_UNAVAILABLE = 503;

  /** Lowest 4xx code — handy as an exclusive/inclusive boundary in range checks. */
  static readonly CLIENT_ERROR_MIN = 400;
  /** Lowest 5xx code — the "no server error below this" boundary. */
  static readonly SERVER_ERROR_MIN = 500;

  static isSuccess(status: number): boolean {
    return status >= 200 && status < 300;
  }

  static isRedirect(status: number): boolean {
    return status >= 300 && status < 400;
  }

  static isClientError(status: number): boolean {
    return status >= 400 && status < 500;
  }

  static isServerError(status: number): boolean {
    return status >= 500;
  }
}
