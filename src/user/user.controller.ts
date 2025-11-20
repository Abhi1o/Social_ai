import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { WorkspaceId } from '../auth/middleware/workspace-isolation.middleware';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId: string;
    email: string;
  };
}

/**
 * User Controller
 * Demonstrates RBAC implementation with permission guards
 * Requirements: 5.3, 5.4, 32.1
 */
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions(Permission.TEAM_INVITE)
  create(@Body() createUserDto: CreateUserDto, @WorkspaceId() workspaceId: string) {
    return this.userService.create({
      ...createUserDto,
      tenantId: workspaceId,
    });
  }

  @Get()
  @Permissions(Permission.TEAM_READ)
  findAll(@WorkspaceId() workspaceId: string) {
    return this.userService.findAll(workspaceId);
  }

  @Get(':id')
  @Permissions(Permission.TEAM_READ)
  findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.userService.findOne(id, workspaceId);
  }

  @Patch(':id')
  @Permissions(Permission.TEAM_UPDATE)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.userService.update(id, workspaceId, updateUserDto);
  }

  @Delete(':id')
  @Permissions(Permission.TEAM_REMOVE)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.userService.remove(id, workspaceId);
  }
}