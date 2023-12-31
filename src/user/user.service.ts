import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {User, UserRole} from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import {
  USER_EXIST,
  USER_NOT_FOUND,
} from './const/user.const';
import { USER_SELECT } from './const/user.select';
import { ACCESS_DENIED } from '../auth/const/auth.const';
import {UserWithSubordinates} from "../common/types/user-with-subordinates";
@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}
  async findAll() {
    return this.prismaService.user.findMany({
      select: USER_SELECT,
    });
  }
  async findSubordinates(userId: string): Promise<UserWithSubordinates> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    const subordinates = user.subordinates || [];

    const subordinatePromises = subordinates.map((subordinate) => this.findSubordinates(subordinate.id));
    const additionalSubordinates = await Promise.all(subordinatePromises);

    return {
      ...user,
      subordinates: additionalSubordinates
    };
  }
  async find(user: User): Promise<User[] | User> {
    switch (user.role) {
      case UserRole.Administrator:
        return this.findAll();
      case UserRole.Boss:
        return this.findSubordinates(user.id);
      case UserRole.User:
        return this.findById(user.id);
      default:
        // Handle any other cases here
        throw new ForbiddenException(ACCESS_DENIED);
    }
  }
  async create(userDto: CreateUserDto): Promise<User> {
    const existUser = await this.findByEmail(userDto.email);
    if (existUser) {
      throw new NotFoundException(USER_EXIST);
    }
    const boss = await this.findBoss();
    const user = await this.prismaService.user.create({
      data: {
        ...userDto,
        role: 'User',
        boss: {
          connect: { id: boss.id },
        },
      },
    });
    return user;
  }
  async findBoss(): Promise<User> {
    return this.prismaService.user.findFirst({
      where: {
        role: 'Boss',
      },
    });
  }
  async findById(id: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: { boss: true, subordinates: true },
    });
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      include: { boss: true, subordinates: true },
    });
    return user;
  }

  async changeBoss(id: string, bossId: string, user: User): Promise<User> {
    const changeBossUser = await this.findById(id);
    if (changeBossUser.userId !== user.id) {
      throw new ForbiddenException(ACCESS_DENIED);
    }
    const updatedUser = await this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        boss: {
          connect: { id: bossId },
        },
      },
    });
    return updatedUser;
  }

}
