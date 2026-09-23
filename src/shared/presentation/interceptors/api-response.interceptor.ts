import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { ApiResponse } from "@neoglito/shared";
import { map, Observable } from "rxjs";

interface RedirectResponse {
    url: string
    statusCode?: number
}

function isRedirectResponse(value: unknown): value is RedirectResponse {
    return typeof value === 'object'
        && value !== null
        && 'url' in value
        && typeof value.url === 'string'
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
    intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
        return next.handle().pipe(
            map((data) => {
                if (isRedirectResponse(data)) {
                    return data
                }

                return {
                    success: true,
                    data,
                    error: null,
                    meta: null,
                }
            }),
        )
    }
}
