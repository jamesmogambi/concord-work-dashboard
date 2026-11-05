import { Suspense } from "react";
import {
  getAgents,
  getActiveTasks,
  getRecentEvents,
  computeOverlaps,
  parseFiles,
} from "@/lib/queries";
import { AgentStatus } from "@/app/components/agent-status";

export default function Dashboard() {
  const agents = getAgents();
  const tasks = getActiveTasks();
  const events = getRecentEvents();
  const overlaps = computeOverlaps(tasks);

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-10">
      <header>
        <h1 className="text-2xl font-bold">Concord Work Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reading live state from <code>.concord/concord.db</code>
        </p>
      </header>

      {overlaps.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-red-600">
            ⚠ Overlap Alerts ({overlaps.length})
          </h2>
          <div className="space-y-2">
            {overlaps.map((o, i) => (
              <div
                key={i}
                className="border border-red-300 bg-red-50 rounded p-3 text-sm"
              >
                <strong>{o.a}</strong> and <strong>{o.b}</strong> both claim{" "}
                <code className="bg-white px-1 rounded">{o.file}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Agents ({agents.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((a) => {
            return (
              <div key={a.agent_id} className="border rounded-lg p-4">
                <div className="font-mono text-sm break-all">{a.agent_id}</div>
                <div className="text-xs text-gray-500 mt-1">{a.kind}</div>
                <Suspense
                  fallback={
                    <span className="text-xs mt-2 inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                      {a.status}
                    </span>
                  }
                >
                  <AgentStatus status={a.status} lastSeen={a.last_seen} />
                </Suspense>
                {a.summary && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {a.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          &quot;stale&quot; = no heartbeat in the last 60s. Copilot CLI entries
          often linger.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Active Tasks ({tasks.length})
        </h2>
        <ul className="space-y-2">
          {tasks.map((t) => {
            const files = parseFiles(t.expected_files);
            return (
              <li key={t.task_id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <strong>{t.title ?? t.task_id}</strong>
                    <span className="ml-2 text-gray-500 text-sm">
                      — {t.agent_id ?? "unowned"}
                    </span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded whitespace-nowrap">
                    v{t.version} · {t.status}
                  </span>
                </div>
                {files.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    Claims:{" "}
                    {files.map((f) => (
                      <code key={f} className="bg-gray-100 px-1 rounded mr-1">
                        {f}
                      </code>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
          {tasks.length === 0 && (
            <p className="text-gray-400">No active tasks.</p>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <ul className="text-sm divide-y">
          {events.map((e) => (
            <li key={e.id} className="py-1.5 flex gap-3 items-baseline">
              <span className="text-gray-400 shrink-0 font-mono text-xs">
                {e.created_at}
              </span>
              <span className="font-mono text-xs text-gray-600">{e.tool}</span>
              <span>{e.status}</span>
              {e.detail && (
                <span className="text-red-600 text-xs">{e.detail}</span>
              )}
              {e.task_id && (
                <span className="text-gray-400 text-xs ml-auto">
                  {e.task_id}
                </span>
              )}
            </li>
          ))}
          {events.length === 0 && (
            <p className="text-gray-400">No events yet.</p>
          )}
        </ul>
      </section>
    </main>
  );
}
