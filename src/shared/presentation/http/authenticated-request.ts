import type { Request } from "express";

export interface AuthenticatedUser {
    id: number
    username: string
}

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser
}
