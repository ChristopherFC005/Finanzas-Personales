import { TransactionsExportService } from "./transactions-export.service";

describe("TransactionsExportService", () => {
  let service: TransactionsExportService;

  beforeEach(() => {
    service = new TransactionsExportService();
  });

  const baseTransaction = {
    id: "t1",
    userId: "u1",
    categoryId: "c1",
    accountId: "a1",
    type: "EXPENSE" as const,
    amount: "45.50" as unknown as number,
    description: "Almuerzo, \"menú\" del día",
    paymentMethod: "CASH" as const,
    transactionDate: new Date("2026-03-05T00:00:00.000Z"),
    notes: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: "c1", userId: null, name: "Comida", icon: "utensils", type: "EXPENSE" as const, isDefault: true, createdAt: new Date() },
    account: { id: "a1", userId: "u1", name: "Efectivo", type: "CASH" as const, bank: null, initialBalance: "0" as unknown as number, creditLimit: null, billingDate: null, paymentDueDate: null, color: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  };

  describe("toCsv", () => {
    it("starts with a UTF-8 BOM so Excel renders accents correctly", () => {
      const csv = service.toCsv([]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it("includes a header row and one row per transaction", () => {
      const csv = service.toCsv([baseTransaction as never]);
      const lines = csv.replace("﻿", "").split("\r\n");
      expect(lines[0]).toBe('"Fecha","Tipo","Categoría","Cuenta","Monto","Descripción","Notas"');
      expect(lines[1]).toContain('"2026-03-05"');
      expect(lines[1]).toContain('"Gasto"');
      expect(lines[1]).toContain('"Comida"');
    });

    it("escapes embedded double quotes so the CSV stays valid", () => {
      const csv = service.toCsv([baseTransaction as never]);
      expect(csv).toContain('"Almuerzo, ""menú"" del día"');
    });
  });

  describe("toPdf", () => {
    it("produces a non-empty PDF buffer starting with the %PDF signature", async () => {
      const buffer = await service.toPdf([baseTransaction as never], "PEN");
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    });
  });
});
