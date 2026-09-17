import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  errors: string[];
  requestId: string;
  path: string;
  timestamp: string;
}

const CODE_BY_STATUS: Record<number, string> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_ERROR",
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpException");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      (request.headers["x-request-id"] as string) ?? randomUUID();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = "Ocurrió un error inesperado.";
    let errors: string[] = [];

    if (isHttp) {
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (typeof body === "object" && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string) ?? message;
        errors = Array.isArray(b.message)
          ? (b.message as string[])
          : Array.isArray(b.errors)
            ? (b.errors as string[])
            : [];
      }
    } else {
      this.logger.error(exception);
    }

    const body: ErrorBody = {
      statusCode: status,
      code: CODE_BY_STATUS[status] ?? "ERROR",
      message,
      errors,
      requestId,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
