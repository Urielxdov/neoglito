import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import type { ApiError, ApiResponse } from "@neoglito/shared";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>()
        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR
        const exceptionResponse = exception instanceof HttpException
            ? exception.getResponse()
            : undefined
        const error = this.toApiError(exception, exceptionResponse, status)
        const body: ApiResponse<null> = {
            success: false,
            data: null,
            error,
            meta: null,
        }

        response.status(status).json(body)
    }

    private toApiError(
        exception: unknown,
        exceptionResponse: string | object | undefined,
        status: number,
    ): ApiError {
        if (typeof exceptionResponse === 'string') {
            return {
                code: HttpStatus[status],
                message: exceptionResponse,
            }
        }

        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const response = exceptionResponse as { error?: unknown; message?: unknown }
            const message = Array.isArray(response.message)
                ? response.message.join(', ')
                : typeof response.message === 'string'
                    ? response.message
                    : 'Ocurrió un error inesperado'

            return {
                code: typeof response.error === 'string' ? response.error : HttpStatus[status],
                message,
                ...(Array.isArray(response.message) && { details: response.message }),
            }
        }

        return {
            code: HttpStatus[status],
            message: exception instanceof Error ? exception.message : 'Ocurrió un error inesperado',
        }
    }
}
