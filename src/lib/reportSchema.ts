import { z } from "zod";

/**
 * Shared report validation schema, extracted from the Mag-ulat form so the
 * admin data-entry grid and CSV import can validate rows with the exact same
 * rules. The Mag-ulat form imports these back, so there is a single source of
 * truth for what makes a valid report.
 */

export type RecordType = "current_supply" | "planting_intention";

const nonEmpty = (label: string) =>
  z.string().trim().min(1, { message: `${label} ay kailangan` }).max(100);

export const VOLUME_VALUES = ["Napakataas", "Mataas", "Katamtaman", "Mababa"] as const;

/**
 * Unified report schema. Validates the whole form object BEFORE any Supabase
 * INSERT so incomplete data can never reach the database (prevents errors
 * like "null value in column volume").
 */
export const baseReportSchema = z.object({
  record_type: z.enum(["current_supply", "planting_intention"]),
  category: nonEmpty("Kategorya"),
  commodity: nonEmpty("Produkto"),
  volume_level: z.enum(VOLUME_VALUES, { message: "Piliin ang dami ng produkto" }),
  status: z.enum(["surplus", "deficit", "balanced"], { message: "Piliin ang kalagayan" }),
  price: z.string().trim(),
  region: nonEmpty("Rehiyon"),
  province: nonEmpty("Lalawigan"),
  municipality: nonEmpty("Bayan"),
  barangay: nonEmpty("Barangay"),
  lat: z.coerce.number({ message: "Ilagay ang latitude" }).min(-90, "Hindi wastong latitude").max(90, "Hindi wastong latitude"),
  lng: z.coerce.number({ message: "Ilagay ang longitude" }).min(-180, "Hindi wastong longitude").max(180, "Hindi wastong longitude"),
  planted_date: z.string().trim(),
  expected_harvest_date: z.string().trim(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const reportSchema = baseReportSchema.superRefine((v, ctx) => {
  if (v.record_type === "current_supply") {
    const n = Number(v.price);
    if (v.price === "" || Number.isNaN(n) || n <= 0 || n > 100000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Ilagay ang tamang presyo (higit sa 0)" });
    }
  }
  if (v.record_type === "planting_intention") {
    if (!v.planted_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["planted_date"], message: "Piliin ang petsa ng pagtatanim" });
    }
    if (!v.expected_harvest_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expected_harvest_date"], message: "Piliin ang inaasahang petsa ng ani" });
    }
  }
});

/** Inferred shape of a validated report (pre-superRefine). */
export type ReportFormValues = z.infer<typeof baseReportSchema>;
