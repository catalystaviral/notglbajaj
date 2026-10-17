import { supabase } from "./supabaseClient";

const PAGE_SIZE = 1000;
const table = import.meta.env.VITE_SUPABASE_TABLE || "results";
const NOT_CONSIDERED = /\[not considered\]/i;

function parseAssessment(value) {
  const display = String(value ?? "").trim();

  if (
    !display ||
    display.toUpperCase() === "ABSENT" ||
    NOT_CONSIDERED.test(display)
  ) {
    return {
      display: display || "—",
      score: 0,
    };
  }

  const score = Number(display);

  return {
    display,
    score: Number.isFinite(score) ? score : 0,
  };
}

export async function loadStudents() {
  if (!supabase) {
    throw new Error(
      "Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.",
    );
  }

  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(
        `
        roll_number,
        full_name,
        department,
        assessment_1,
        assessment_2
      `,
      )
      .order("roll_number", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  return rows.map((row) => {
    const assessment1 = parseAssessment(row.assessment_1);
    const assessment2 = parseAssessment(row.assessment_2);

    return {
      roll: String(row.roll_number).trim(),
      name: row.full_name.trim(),
      branch: row.department.trim(),
      assessment1: assessment1.score,
      assessment1Display: assessment1.display,
      assessment2: assessment2.score,
      assessment2Display: assessment2.display,

      // Recalculate instead of trusting the stored total.
      total: assessment1.score + assessment2.score,
    };
  });
}
