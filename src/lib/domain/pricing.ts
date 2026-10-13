/**
 * One authoritative pricing engine (contract §9).
 * Deterministic, thoroughly tested, used by booking + session billing.
 * Returns subtotal, adjustments, final amount + line-item explanation.
 * No dependence on incidental row/array ordering — rules sort by priority.
 */
import type { PricingRuleRow } from "@/lib/db/schema";

export interface PriceLine {
  label: string;
  amountPaise: number;
}

export interface PriceQuote {
  subtotalPaise: number;
  totalPaise: number;
  lines: PriceLine[];
}

interface RuleConditions {
  min_hours?: number;
  days?: string[];
  start?: string;
  end?: string;
  membership?: string;
}

function conditionsOf(rule: Pick<PricingRuleRow, "conditions">): RuleConditions {
  return (rule.conditions ?? {}) as RuleConditions;
}

export function quoteBookingPrice(args: {
  basePricePerHourPaise: number;
  hours: number;
  rules: PricingRuleRow[];
  dayOfWeek: string;
  startTimeHHMM: string;
  membershipType: string;
}): PriceQuote {
  const { basePricePerHourPaise, hours, rules, dayOfWeek, startTimeHHMM, membershipType } = args;
  const subtotalPaise = basePricePerHourPaise * hours;
  const sorted = [...rules]
    .filter((r) => r.isActive)
    .sort((a, b) => b.priority - a.priority);
  const lines: PriceLine[] = [{ label: `Base ${hours}h`, amountPaise: subtotalPaise }];

  const pack = sorted.find(
    (r) => r.ruleType === "package" && Number(conditionsOf(r).min_hours ?? Infinity) <= hours,
  );
  if (pack?.fixedPrice != null) {
    return {
      subtotalPaise,
      totalPaise: Math.max(Math.round(pack.fixedPrice), 0),
      lines: [...lines, { label: `Package: ${pack.name}`, amountPaise: pack.fixedPrice - subtotalPaise }],
    };
  }

  let total = subtotalPaise;
  for (const rule of sorted) {
    const c = conditionsOf(rule);
    if (
      rule.ruleType === "happy_hour" &&
      Array.isArray(c.days) &&
      c.days.includes(dayOfWeek) &&
      startTimeHHMM >= String(c.start ?? "") &&
      startTimeHHMM < String(c.end ?? "")
    ) {
      const off = Math.round((total * Number(rule.discountPercent ?? 0)) / 100);
      total -= off;
      lines.push({ label: `Happy hour: ${rule.name}`, amountPaise: -off });
    }
    if (rule.ruleType === "membership_discount" && membershipType === c.membership) {
      const off = Math.round((total * Number(rule.discountPercent ?? 0)) / 100);
      total -= off;
      lines.push({ label: `Membership: ${rule.name}`, amountPaise: -off });
    }
  }

  return { subtotalPaise, totalPaise: Math.max(Math.round(total), 0), lines };
}

/** Session billing reuses the same engine: hours are fractional from minutes. */
export function quoteSessionPrice(args: {
  basePricePerHourPaise: number;
  billableMinutes: number;
  rules: PricingRuleRow[];
  dayOfWeek: string;
  startTimeHHMM: string;
  membershipType: string | null;
}): PriceQuote {
  const hours = args.billableMinutes / 60;
  // Whole-hour packages still apply; fractional time bills proportionally otherwise.
  const wholeHours = Math.floor(hours);
  const base = Math.ceil(args.basePricePerHourPaise * hours);
  const quote = quoteBookingPrice({
    basePricePerHourPaise: args.basePricePerHourPaise,
    hours: wholeHours > 0 ? wholeHours : 0,
    rules: args.rules,
    dayOfWeek: args.dayOfWeek,
    startTimeHHMM: args.startTimeHHMM,
    membershipType: args.membershipType ?? "none",
  });
  if (wholeHours === 0 || quote.totalPaise === base) {
    return { subtotalPaise: base, totalPaise: Math.max(Math.ceil(base), 0), lines: quote.lines };
  }
  // Package matched on whole hours: honour it, else fall back to proportional.
  const packMatched = quote.lines.some((l) => l.label.startsWith("Package:"));
  if (packMatched && hours >= wholeHours) return quote;
  return { subtotalPaise: base, totalPaise: Math.max(Math.ceil(base), 0), lines: [{ label: "Base pro-rata", amountPaise: base }] };
}
