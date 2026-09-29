"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CategoryBreakdown } from "@/hooks/use-statistics";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/utils";

const COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--info)",
  "var(--warning)",
  "var(--danger)",
  "#0ea5e9",
  "#f472b6",
  "#a3e635",
  "#fb923c",
  "#c084fc",
];

export function CategoryBreakdownChart({
  data,
  currency,
}: {
  data: CategoryBreakdown[];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoría</CardTitle>
      </CardHeader>
      {data.length === 0 ? (
        <EmptyState
          icon={PieChartIcon}
          title="Sin gastos en este periodo"
          description="Cuando registres gastos, aquí verás en qué categorías se te va el dinero."
        />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.categoryId} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                }}
                formatter={(value: number, name: string, item) => [
                  `${formatMoney(value, currency)} (${formatPercent(item.payload.percentage)})`,
                  name,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={48}
                wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
