import { Injectable } from "@nestjs/common";
import { Account, Category, Transaction } from "@prisma/client";
import PDFDocument from "pdfkit";

type ExportableTransaction = Transaction & {
  category: Category;
  account: Account | null;
};

const TYPE_LABEL: Record<string, string> = { INCOME: "Ingreso", EXPENSE: "Gasto" };

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class TransactionsExportService {
  toCsv(transactions: ExportableTransaction[]): string {
    const header = ["Fecha", "Tipo", "Categoría", "Cuenta", "Monto", "Descripción", "Notas"];
    const rows = transactions.map((t) => [
      formatDateOnly(t.transactionDate),
      TYPE_LABEL[t.type] ?? t.type,
      t.category.name,
      t.account?.name ?? "",
      t.amount.toString(),
      t.description ?? "",
      t.notes ?? "",
    ]);

    // Leading BOM so Excel detects UTF-8 and renders accents correctly.
    return (
      "﻿" +
      [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")
    );
  }

  async toPdf(
    transactions: ExportableTransaction[],
    currency: string,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(18).text("Cyfra — Movimientos", { align: "left" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#5b6172")
      .text(`Generado el ${formatDateOnly(new Date())} · ${transactions.length} movimientos`);
    doc.moveDown(1);

    const colX = { date: 40, type: 105, category: 155, amount: 460 };

    const drawHeader = () => {
      doc.fontSize(9).fillColor("#0b0f19").font("Helvetica-Bold");
      doc.text("Fecha", colX.date, doc.y, { continued: false, width: 60 });
      doc.text("Tipo", colX.type, doc.y - 11, { width: 45 });
      doc.text("Categoría / descripción", colX.category, doc.y - 11, { width: 295 });
      doc.text("Monto", colX.amount, doc.y - 11, { width: 95, align: "right" });
      doc.moveDown(0.5);
      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .strokeColor("#e4e7ee")
        .stroke();
      doc.moveDown(0.3);
      doc.font("Helvetica");
    };

    drawHeader();

    for (const t of transactions) {
      if (doc.y > 760) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      const isIncome = t.type === "INCOME";
      doc.fontSize(9).fillColor("#0b0f19");
      doc.text(formatDateOnly(t.transactionDate), colX.date, y, { width: 60 });
      doc.text(TYPE_LABEL[t.type] ?? t.type, colX.type, y, { width: 45 });
      const label = t.description ? `${t.category.name} · ${t.description}` : t.category.name;
      doc.text(label, colX.category, y, { width: 295 });
      doc
        .fillColor(isIncome ? "#059669" : "#dc2626")
        .text(
          `${isIncome ? "+" : "-"}${t.amount.toString()} ${currency}`,
          colX.amount,
          y,
          { width: 95, align: "right" },
        );
      doc.moveDown(0.6);
    }

    doc.end();
    return done;
  }
}
