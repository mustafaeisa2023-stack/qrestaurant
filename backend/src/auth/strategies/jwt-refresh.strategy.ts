// ============================================================
// QRestaurant - JWT Refresh Token Strategy
// Used by RefreshTokenGuard to validate refresh tokens
// ============================================================

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const authHeader = req.get('Authorization');
    if (!authHeader) throw new ForbiddenException('No authorization header');

    const refreshToken = authHeader.replace('Bearer ', '').trim();
    if (!refreshToken) throw new ForbiddenException('Refresh token missing');

    return {
      ...payload,
      refreshToken,
    };
  }
}
