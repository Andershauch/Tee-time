import { z } from "zod";
import { isValidPhone } from "@/lib/phone";

const lineSchema = z.object({
  productId: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(20),
  options: z.array(z.string().min(1).max(100)).max(12),
  note: z.string().trim().max(160),
});

export const orderRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  placement: z.enum(["bane", "klubhus", "terrasse"]),
  locationDetail: z.string().trim().max(100).optional().default(""),
  requestedMinutes: z.number().int().min(20).max(1440),
  customerName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(32).refine((value) => value === "" || isValidPhone(value), "Mobilnummeret er ikke gyldigt.").optional().default(""),
  lines: z.array(lineSchema).min(1).max(30),
}).superRefine((value, context) => {
  if (value.placement === "terrasse" && !value.locationDetail) {
    context.addIssue({ code: "custom", path: ["locationDetail"], message: "Angiv terrassebord eller område." });
  }
  if (value.placement === "bane" && !value.phone) {
    context.addIssue({ code: "custom", path: ["phone"], message: "Mobilnummer er påkrævet på banen." });
  }
  const uniqueLines = new Set(value.lines.map((line) => `${line.productId}:${[...line.options].sort().join("|")}:${line.note}`));
  if (uniqueLines.size !== value.lines.length) {
    context.addIssue({ code: "custom", path: ["lines"], message: "Kurven indeholder dublerede linjer." });
  }
  if (value.lines.some((line) => new Set(line.options).size !== line.options.length)) {
    context.addIssue({ code: "custom", path: ["lines"], message: "Et tilvalg kan kun vælges én gang." });
  }
});

export type OrderRequest = z.infer<typeof orderRequestSchema>;
