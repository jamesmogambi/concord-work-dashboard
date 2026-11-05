import { Suspense } from "react";
import {
  getAgents,
  getActiveTasks,
  getRecentEvents,
  computeOverlaps,
  parseFiles,
} from "@/lib/queries";
import { dbPath } from "@/lib/db";
import { AgentStatus } from "@/app/components/agent-status";

const usingSeed = dbPath().includes(".seed");

export default function Dashboard() {
  const agents = getAgents();
  const tasks = getActiveTasks();
  const events = getRecentEvents();
  const overlaps = computeOverlaps(tasks);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-3xl font-bold tracking-tight">
              Concord Work Dashboard
            </h1>
          </div>
          <p className="text-slate-300 text-sm mt-2 ml-4">
            Live coordination state from <code className="text-slate-200 bg-slate-700/50 px-1 rounded">{dbPath()}</code>
          </p>
          {usingSeed && (
            <p className="text-amber-300 text-xs mt-2 ml-4">
              Showing sample data — the local Concord workspace was not found. Set{" "}
              <code className="text-amber-200 bg-slate-700/50 px-1 rounded">
                CONCORD_DB_PATH
              </code>{" "}
              to point at your own <code>.concord/concord.db</code>.
            </p>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">
        {overlaps.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              Overlap Alerts ({overlaps.length})
            </h2>
            <div className="space-y-2">
              {overlaps.map((o, i) => (
                <div
                  key={i}
                  className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm shadow-sm"
                >
                  <strong>{o.a}</strong> and <strong>{o.b}</strong> both claim{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-red-200 text-red-700">
                    {o.file}
                  </code>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3 text-slate-800">
            Agents ({agents.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((a) => {
              return (
                <div
                  key={a.agent_id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="font-mono text-sm break-all text-slate-800">
                    {a.agent_id}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{a.kind}</div>
                  <Suspense
                    fallback={
                      <span className="text-xs mt-2 inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                        {a.status}
                      </span>
                    }
                  >
                    <AgentStatus status={a.status} lastSeen={a.last_seen} />
                  </Suspense>
                  {a.summary && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {a.summary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            &quot;stale&quot; = no heartbeat in the last 60s. Copilot CLI entries
            often linger.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 text-slate-800">
            Active Tasks ({tasks.length})
          </h2>
          <ul className="space-y-2">
            {tasks.map((t) => {
              const files = parseFiles(t.expected_files);
              return (
                <li
                  key={t.task_id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <strong className="text-slate-800">
                        {t.title ?? t.task_id}
                      </strong>
                      <span className="ml-2 text-slate-500 text-sm">
                        — {t.agent_id ?? "unowned"}
                      </span>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded whitespace-nowrap font-medium">
                      v{t.version} · {t.status}
                    </span>
                  </div>
                  {files.length > 0 && (
                    <div className="text-xs text-slate-500 mt-2">
                      Claims:{" "}
                      {files.map((f) => (
                        <code
                          key={f}
                          className="bg-slate-100 px-1.5 py-0.5 rounded mr-1 text-slate-600"
                        >
                          {f}
                        </code>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
            {tasks.length === 0 && (
              <p className="text-slate-400">No active tasks.</p>
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 text-slate-800">
            Recent Activity
          </h2>
          <ul className="bg-white border border-slate-200 rounded-xl divide-y shadow-sm">
            {events.map((e) => (
              <li
                key={e.id}
                className="px-4 py-2.5 flex gap-3 items-baseline text-sm"
              >
                <span className="text-slate-400 shrink-0 font-mono text-xs">
                  {e.created_at}
                </span>
                <span className="font-mono text-xs text-slate-600">
                  {e.tool}
                </span>
                <span className="text-slate-700">{e.status}</span>
                {e.detail && (
                  <span className="text-red-600 text-xs font-medium">
                    {e.detail}
                  </span>
                )}
                {e.task_id && (
                  <span className="text-slate-400 text-xs ml-auto">
                    {e.task_id}
                  </span>
                )}
              </li>
            ))}
            {events.length === 0 && (
              <p className="px-4 py-4 text-slate-400 text-sm">
                No events yet.
              </p>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}