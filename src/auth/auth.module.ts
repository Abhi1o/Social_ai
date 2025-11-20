import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { UserModule } from '../user/user.module';
import { TenantModule } from '../tenant/tenant.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { PermissionService } from './services/permission.service';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    UserModule,
    TenantModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, PermissionsController],
  providers: [
    AuthService, 
    PermissionService,
    JwtStrategy, 
    LocalStrategy, 
    RefreshTokenStrategy,
    PermissionsGuard,
  ],
  exports: [AuthService, PermissionService, PermissionsGuard],
})
export class AuthModule {}