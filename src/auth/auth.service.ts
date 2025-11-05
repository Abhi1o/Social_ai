import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { TenantService } from '../tenant/tenant.service';
import { User, UserRole } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  access_token: string;
  user: Omit<User, 'password'>;
  tenant: {
    id: string;
    name: string;
    planTier: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private tenantService: TenantService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);
    
    if (user && await this.userService.validatePassword(user, password)) {
      return user;
    }
    
    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Create JWT payload with tenant_id claim
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return {
      access_token,
      user: userWithoutPassword,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        planTier: user.tenant.planTier,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Create tenant first
    const tenant = await this.tenantService.create({
      name: registerDto.tenantName,
      planTier: registerDto.planTier,
    });

    // Create user
    const user = await this.userService.create({
      ...registerDto,
      tenantId: tenant.id,
      role: UserRole.ADMIN, // First user is always admin
    });

    // Load user with tenant relation
    const userWithTenant = await this.userService.findOne(user.id, tenant.id);

    // Create JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Remove password from user object
    const { password, ...userWithoutPassword } = userWithTenant;

    return {
      access_token,
      user: userWithoutPassword,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        planTier: tenant.planTier,
      },
    };
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.userService.findOne(payload.sub, payload.tenantId);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}