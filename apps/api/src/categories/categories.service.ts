import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, type?: TransactionType) {
    return this.prisma.category.findMany({
      where: {
        AND: [
          { OR: [{ userId: null }, { userId }] },
          type ? { type } : {},
        ],
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { ...dto, userId, isDefault: false },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.getOwnedOrThrow(userId, id);
    if (category.isDefault) {
      throw new ForbiddenException(
        "No puedes modificar una categoría predeterminada.",
      );
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const category = await this.getOwnedOrThrow(userId, id);
    if (category.isDefault) {
      throw new ForbiddenException(
        "No puedes eliminar una categoría predeterminada.",
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async getOwnedOrThrow(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || category.userId !== userId) {
      throw new NotFoundException("Categoría no encontrada.");
    }
    return category;
  }
}
