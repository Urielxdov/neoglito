import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";

interface JwtPayload {
    sub: number
    username: string
}

function extractJwtFromCookie(request: Request): string | null {
    const cookie = request.headers.cookie

    if (!cookie) {
        return null
    }

    const accessToken = cookie
        .split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith('access_token='))
        ?.slice('access_token='.length)

    return accessToken ? decodeURIComponent(accessToken) : null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        const secret = process.env.JWT_SECRET

        if (!secret) {
            throw new Error('JWT_SECRET is required')
        }

        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                extractJwtFromCookie,
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: secret,
        })
    }

    validate(payload: JwtPayload) {
        return {
            id: payload.sub,
            username: payload.username,
        }
    }
}
