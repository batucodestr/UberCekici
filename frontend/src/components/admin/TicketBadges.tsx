import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/services/admin";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/types";

const STATUS_COLORS: Record<TicketStatus, string> = {
  new: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "bg-zinc-100 text-zinc-500",
  normal: "bg-zinc-100 text-zinc-600",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const CATEGORY_COLORS: Record<TicketCategory, string> = {
  complaint: "bg-red-50 text-red-600",
  request: "bg-blue-50 text-blue-600",
  suggestion: "bg-violet-50 text-violet-600",
  other: "bg-zinc-100 text-zinc-600",
};

const BASE = "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`${BASE} ${STATUS_COLORS[status]}`}>{TICKET_STATUS_LABELS[status]}</span>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`${BASE} ${PRIORITY_COLORS[priority]}`}>
      {TICKET_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function TicketCategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <span className={`${BASE} ${CATEGORY_COLORS[category]}`}>
      {TICKET_CATEGORY_LABELS[category]}
    </span>
  );
}
