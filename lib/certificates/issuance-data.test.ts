import { describe, expect, it } from "vitest";
import { mapEnrollmentRowToIssuanceContext, type RawEnrollmentRow } from "./issuance-data";

const validRow: RawEnrollmentRow = {
  organization_id: "org-1",
  recipients: { full_name: "Jordan Lee" },
  cohorts: {
    ends_on: "2026-08-14",
    organizations: { name: "Northstar Learning" },
    programs: { name: "Design Systems Workshop" },
    templates: { preset_key: "editorial", settings: { accent: "#9a5b32" } },
  },
};

describe("mapEnrollmentRowToIssuanceContext", () => {
  it("maps a fully populated row", () => {
    const context = mapEnrollmentRowToIssuanceContext(validRow);
    expect(context).toEqual({
      organizationId: "org-1",
      recipientName: "Jordan Lee",
      organizationName: "Northstar Learning",
      programName: "Design Systems Workshop",
      completionDateLabel: "August 14, 2026",
      templateKey: "editorial",
      accent: "#9a5b32",
    });
  });

  it("falls back to the modern template and default accent when unset", () => {
    const context = mapEnrollmentRowToIssuanceContext({
      ...validRow,
      cohorts: {
        ends_on: validRow.cohorts!.ends_on,
        organizations: validRow.cohorts!.organizations,
        programs: validRow.cohorts!.programs,
        templates: { preset_key: "unknown", settings: null },
      },
    });
    expect(context.templateKey).toBe("modern");
    expect(context.accent).toBe("#1f6f4a");
  });

  it("falls back to a placeholder label when the completion date is missing", () => {
    const context = mapEnrollmentRowToIssuanceContext({
      ...validRow,
      cohorts: {
        ends_on: null,
        organizations: validRow.cohorts!.organizations,
        programs: validRow.cohorts!.programs,
        templates: validRow.cohorts!.templates,
      },
    });
    expect(context.completionDateLabel).toBe("Completion date");
  });

  it("throws when required relations are missing", () => {
    expect(() => mapEnrollmentRowToIssuanceContext({ ...validRow, recipients: null })).toThrow();
    expect(() => mapEnrollmentRowToIssuanceContext({ ...validRow, cohorts: null })).toThrow();
  });
});
