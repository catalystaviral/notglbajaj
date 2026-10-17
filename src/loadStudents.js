import { supabase } from "./supabaseClient";

export const PAGE_SIZE = 100;
const rankingsView = import.meta.env.VITE_SUPABASE_RANKINGS_VIEW || "student_rankings";

export class ScoreboardError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "ScoreboardError";
    this.code = code;
  }
}

function requireClient() {
  if (!supabase) {
    throw new ScoreboardError(
      "configuration",
      "The Supabase URL or publishable key is missing from this deployment.",
    );
  }
}

function throwQueryError(error) {
  if (!error) return;

  if (["42P01", "PGRST202", "PGRST205"].includes(error.code)) {
    throw new ScoreboardError(
      "setup",
      "The ranking view is not installed. Run supabase/scoreboard.sql in the Supabase SQL Editor.",
      error,
    );
  }

  if (error.code === "42501" || /permission|row-level security/i.test(error.message)) {
    throw new ScoreboardError(
      "permission",
      "Supabase blocked this request. Check the view grants and Row Level Security policy.",
      error,
    );
  }

  throw new ScoreboardError(
    "network",
    "Could not reach the scoreboard database. Check your connection and try again.",
    error,
  );
}

function normalizeStudent(row, rankField = "overall_rank") {
  return {
    roll: String(row.roll_number ?? "").trim(),
    name: String(row.full_name ?? "").trim(),
    branch: String(row.department ?? "").trim(),
    assessment1: Number(row.assessment_1_score) || 0,
    assessment1Display: String(row.assessment_1_display ?? "—"),
    assessment2: Number(row.assessment_2_score) || 0,
    assessment2Display: String(row.assessment_2_display ?? "—"),
    total: Number(row.total_score) || 0,
    rank: Number(row[rankField]) || 0,
    departmentRank: Number(row.department_rank) || 0,
  };
}

export async function loadDepartments() {
  requireClient();
  const { data, error } = await supabase.rpc("get_scoreboard_departments");

  throwQueryError(error);
  return [...new Set((data || []).map((row) => row.department).filter(Boolean))];
}

export async function loadLeaderboard({ branch = "All", page = 1 } = {}) {
  requireClient();
  const from = (page - 1) * PAGE_SIZE;
  const rankField = branch === "All" ? "overall_rank" : "department_rank";
  let query = supabase
    .from(rankingsView)
    .select("*", { count: "exact" })
    .order(rankField, { ascending: true })
    .order("assessment_2_score", { ascending: false })
    .order("full_name", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (branch !== "All") query = query.eq("department", branch);

  const { data, count, error } = await query;
  throwQueryError(error);

  return {
    students: (data || []).map((row) => normalizeStudent(row, rankField)),
    total: count || 0,
  };
}

export async function loadStudentByRoll(roll) {
  requireClient();
  const { data, error } = await supabase
    .from(rankingsView)
    .select("*")
    .eq("roll_number", roll.trim())
    .maybeSingle();

  throwQueryError(error);
  return data ? normalizeStudent(data) : null;
}
