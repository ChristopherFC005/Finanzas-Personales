import { Injectable, NotFoundException } from "@nestjs/common";
import { Account, TransactionType } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";

interface MovementTotal {
  accountId: string | null;
  type: TransactionType;
  _sum: { amount: unknown };
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    if (accounts.length === 0) {
      return [];
    }

    const movements = await this.prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: {
        userId,
        deletedAt: null,
        accountId: { in: accounts.map((a) => a.id) },
      },
      _sum: { amount: true },
    });

    return accounts.map((account) => this.withComputedBalance(account, movements));
  }

  async findOne(userId: string, id: string) {
    const account = await this.getOwnedOrThrow(userId, id);
    const movements = await this.prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, deletedAt: null, accountId: id },
      _sum: { amount: true },
    });
    return this.withComputedBalance(account, movements);
  }

  async create(userId: string, dto: CreateAccountDto) {
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        bank: dto.bank,
        initialBalance: dto.initialBalance ?? "0",
        creditLimit: dto.creditLimit,
        color: dto.color,
      },
    });
    return this.withComputedBalance(account, []);
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.account.update({ where: { id }, data: dto });
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.account.delete({ where: { id } });
  }

  private async getOwnedOrThrow(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account || account.userId !== userId) {
      throw new NotFoundException("Cuenta no encontrada.");
    }
    return account;
  }

  private withComputedBalance(account: Account, movements: MovementTotal[]) {
    const income = Number(
      movements.find((m) => m.accountId === account.id && m.type === "INCOME")?._sum
        .amount ?? 0,
    );
    const expense = Number(
      movements.find((m) => m.accountId === account.id && m.type === "EXPENSE")?._sum
        .amount ?? 0,
    );
    const currentBalance = Number(account.initialBalance) + income - expense;
    const creditLimit = account.creditLimit ? Number(account.creditLimit) : null;

    return {
      ...account,
      currentBalance,
      availableCredit:
        account.type === "CREDIT" && creditLimit !== null
          ? creditLimit + currentBalance
          : null,
    };
  }
}
