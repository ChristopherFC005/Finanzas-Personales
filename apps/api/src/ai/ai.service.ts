import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { StatisticsService } from "../statistics/statistics.service";
import { AskAssistantDto } from "./dto/ask-assistant.dto";

/**
 * Builds a minimal, aggregated financial context for the current user and
 * asks an LLM to answer in natural language. Only rounded aggregates are
 * sent — never raw transaction lists, credentials, tokens or other users'
 * data — to keep the payload sent to the external AI provider to the
 * minimum necessary (spec §25).
 */
@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statistics: StatisticsService,
  ) {}

  async ask(userId: string, dto: AskAssistantDto): Promise<{ answer: string }> {
    const context = await this.buildContext(userId);
    const answer = await this.callProvider(dto.question, context);
    return { answer };
  }

  private async buildContext(userId: string) {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    const [summary, budgets, goals] = await Promise.all([
      this.statistics.summary(userId, { period: "this_month" }),
      this.prisma.budget.findMany({
        where: { userId, month, year },
        include: { category: { select: { name: true } } },
      }),
      this.prisma.savingsGoal.findMany({
        where: { userId, status: "ACTIVE" },
        select: { name: true, targetAmount: true, currentAmount: true, targetDate: true },
      }),
    ]);

    return {
      thisMonth: {
        income: summary.income,
        expenses: summary.expenses,
        savings: summary.savings,
        savingsRate: summary.savingsRate,
        topExpenseCategory: summary.topExpenseCategory?.name ?? null,
      },
      budgets: budgets.map((b) => ({
        category: b.category.name,
        amount: Number(b.amount),
      })),
      goals: goals.map((g) => ({
        name: g.name,
        target: Number(g.targetAmount),
        current: Number(g.currentAmount),
        targetDate: g.targetDate,
      })),
    };
  }

  private async callProvider(
    question: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "El asistente financiero no está configurado.",
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        system:
          "Eres el asistente financiero de FinanZen. Responde en español, de forma breve y clara, " +
          "usando EXCLUSIVAMENTE los datos financieros agregados que se te proporcionan en JSON. " +
          "No inventes cifras. Si no tienes datos suficientes, dilo explícitamente.",
        messages: [
          {
            role: "user",
            content: `Datos financieros del usuario (JSON):\n${JSON.stringify(context)}\n\nPregunta: ${question}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        "El asistente financiero no está disponible en este momento.",
      );
    }

    const data = (await response.json()) as {
      content: { type: string; text?: string }[];
    };
    return (
      data.content.find((block) => block.type === "text")?.text ??
      "No se pudo generar una respuesta."
    );
  }
}
