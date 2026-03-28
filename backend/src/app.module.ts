import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import { PrismaModule }    from './prisma/prisma.module';
import { AuthModule }      from './auth/auth.module';
import { TablesModule }    from './tables/tables.module';
import { MenuModule }      from './menu/menu.module';
import { OrdersModule }    from './orders/orders.module';
import { WebsocketModule } from './websocket/websocket.module';
import { UploadsModule }   from './uploads/uploads.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UsersModule }     from './users/users.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),

    // Serve uploaded images at /uploads/*
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { maxAge: '30d', etag: true },
    }),

    // Rate limiting: 10/s, 100/min, 1000/hr
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => [
        { name: 'short',  ttl: 1000,    limit: 10 },
        { name: 'medium', ttl: 60000,   limit: 100 },
        { name: 'long',   ttl: 3600000, limit: 1000 },
      ],
    }),

    // Structured logging
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) =>
              `${timestamp} [${context || 'App'}] ${level}: ${message}`,
            ),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    TablesModule,
    MenuModule,
    OrdersModule,
    WebsocketModule,
    UploadsModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
