import { apiGet } from "./api";

export type OutstandingStatus = {
  isBlocked: boolean;
  totalOutstanding: number;
  dueDate: string | null;
  message: string;
  duesSupportEmail?: string;
  duesSupportPhone?: string;
  charges: Array<{
    category: string;
    amount: number;
  }>;
};

export async function fetchOutstandingStatus(): Promise<OutstandingStatus | null> {
  try {
    const data = await apiGet<OutstandingStatus>("/house-dues/my-status");
    return data;
  } catch {
    return null;
  }
}

export function getOutstandingAlertMessage(status: OutstandingStatus): string {
  const total = Number(status.totalOutstanding ?? 0);
  const dueDate = status.dueDate ? new Date(status.dueDate) : null;
  const due = dueDate ? dueDate.toLocaleDateString() : "not set";
  if (total <= 0) return "No outstanding payment.";
  const supportEmail = String(status.duesSupportEmail ?? "").trim();
  const supportPhone = String(status.duesSupportPhone ?? "").trim();
  const contactLine =
    supportEmail || supportPhone
      ? `For details on clearing dues, contact us${supportEmail ? ` at ${supportEmail}` : ""}${supportPhone ? `${supportEmail ? " or " : " at "}${supportPhone}` : ""}.`
      : "";
  const extraMessage = String(status.message ?? "").trim();
  const showExtraMessage = extraMessage && !/within\s+\d+\s+days/i.test(extraMessage);
  return (
    `Outstanding payment: ${Math.round(total)}\n` +
    `Due by: ${due}\n` +
    (showExtraMessage ? extraMessage : "Please clear your dues to continue services.") +
    (contactLine ? `\n${contactLine}` : "")
  );
}
