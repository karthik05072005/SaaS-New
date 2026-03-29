import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TenantService } from '../tenant/tenant.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, ChangePasswordDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private tenantService: TenantService,
    private jwtService: JwtService,
  ) { }

  async registerTenant(registerDto: RegisterDto) {
    const { clinicName, userName, email, password, phone } = registerDto;

    const userExists = await this.usersService.checkEmailExists(email);
    if (userExists) {
      throw new ConflictException('Email already in use.');
    }

    const tenant = await this.tenantService.createTenant(clinicName, email, phone);
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await this.usersService.create(tenant.id, {
      name: userName || 'Admin',
      email,
      password: hashedPassword,
      role: Role.ADMIN,
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      tenant: { name: tenant.name, slug: tenant.slug },
      user: { name: user.name, email: user.email, role: user.role },
    };
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.usersService.findByEmailForAuth(loginDto.email);
      if (
        !user ||
        !(await bcrypt.compare(loginDto.password, user.password))
      ) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
      };
    } catch (error: any) {
      this.logger.error(`Login Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Admin creates a new user (doctor, receptionist, etc.) within their tenant.
   */
  async createUser(tenantId: string, dto: CreateUserDto) {
    const userExists = await this.usersService.checkEmailExists(dto.email);
    if (userExists) throw new ConflictException('Email already in use.');

    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash(dto.password, salt);

    return this.usersService.create(tenantId, {
      name: dto.name,
      email: dto.email,
      password,
      role: dto.role as Role,
      doctorProfile: dto.doctorProfile as any,
    });
  }

  /**
   * Returns the profile of the currently logged-in user.
   */
  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    // Remove sensitive fields
    const { password: _, ...profile } = user as any;
    return profile;
  }

  /**
   * Change the password for the currently logged-in user.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');

    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(dto.newPassword, salt);
    await this.usersService.updatePassword(userId, newHash);

    return { message: 'Password changed successfully' };
  }
}
