import React from "react";
import {
  getExpenses,
  getExpenseTotals,
  getIncomes,
  getIncomeTotals,
} from "./actions";
import { ExpensesClient } from "./ExpensesClient";
import { getActingContext } from "../actions";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Expenses & Income | Gaming Mania Delhi" };

export default async function ExpensesPage() {
  const [expenses, incomes, expenseTotals, incomeTotals, acting] = await Promise.all([
    getExpenses(),
    getIncomes(),
    getExpenseTotals(),
    getIncomeTotals(),
    getActingContext(),
  ]);
  return (
    <ExpensesClient
      initialExpenses={expenses}
      initialIncomes={incomes}
      initialExpenseTotals={expenseTotals}
      initialIncomeTotals={incomeTotals}
      canManageMoney={
        hasPermission(acting.effectiveRole, "expense.manage") &&
        hasPermission(acting.effectiveRole, "income.manage")
      }
    />
  );
}
