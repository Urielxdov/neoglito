import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

interface AuthenticatedUser {
    id: number
    username: string
}

@Injectable()
export class AuthUseCase {
    constructor(private readonly jwtService: JwtService) {}

    async execute(user: AuthenticatedUser): Promise<{ accessToken: string }> {
        const payload = {
            sub: user.id,
            username: user.username,
        }

        return {
            accessToken: await this.jwtService.signAsync(payload),
        }
    }
}
