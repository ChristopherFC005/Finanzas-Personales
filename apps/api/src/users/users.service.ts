import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });
    if (!profile) {
      throw new NotFoundException("Perfil no encontrado.");
    }
    return profile;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.profile.update({
      where: { id: userId },
      data: dto,
    });
  }

  async getPreferences(userId: string) {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });
    if (!preferences) {
      throw new NotFoundException("Preferencias no encontradas.");
    }
    return preferences;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }
}
