import { getDb } from "./db";

export type Agent = {
  agent_id: string;
  kind: string;
  summary: string | null;
  status: string;
  first_seen: string | null;
  last_seen: string | null;
};

export type Task = {
  task_id: string;
  title: string | null;
  agent_id: string | null;
  expected_files: string;
  version: number;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Event = {
  id: number;
  task_id: string | null;
  tool: string;
  status: string;
  detail: string | null;
  created_at: string;
};

export function getAgents(): Agent[] {
  return getDb()
    .prepare("SELECT * FROM agents ORDER BY agent_id")
    .all() as Agent[];
}

export function getActiveTasks(): Task[] {
  return getDb()
    .prepare("SELECT * FROM tasks WHERE status = 'active' ORDER BY created_at")
    .all() as Task[];
}

export function getRecentEvents(limit = 20): Event[] {
  return getDb()
    .prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Event[];
}

export function parseFiles(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export type Overlap = { a: string; b: string; file: string };

export function computeOverlaps(tasks: Task[]): Overlap[] {
  const overlaps: Overlap[] = [];
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const filesA = parseFiles(tasks[i].expected_files);
      const filesB = parseFiles(tasks[j].expected_files);
      const shared = filesA.filter((f) => filesB.includes(f));
      for (const file of shared) {
        overlaps.push({
          a: tasks[i].agent_id ?? tasks[i].task_id,
          b: tasks[j].agent_id ?? tasks[j].task_id,
          file,
        });
      }
    }
  }
  return overlaps;
}
