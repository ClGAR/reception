"use client";

import { useState, useTransition } from "react";
import { BookOpen, FlaskConical, Plus, SendHorizontal, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, EmptyState, Field, Input, PageHeader, Select, Switch, Textarea, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { deleteKnowledge, saveKnowledge, testKnowledge } from "@/server/actions";

interface Entry { id: string; category: string; question: string; answer: string; active: boolean }
const categories = [
  ["hours", "Business hours"],
  ["pricing", "Prices"],
  ["location", "Location"],
  ["parking", "Parking"],
  ["policy", "Policies"],
  ["promo", "Promotions"],
  ["faq", "Common questions"],
] as const;
const catLabel = Object.fromEntries(categories) as Record<string, string>;

export function KnowledgeManager({ entries, canEdit }: { entries: Entry[]; canEdit: boolean }) {
  const [cat, setCat] = useState<string>("all");
  const [edit, setEdit] = useState<Entry | "new" | null>(null);
  const shown = entries.filter((e) => cat === "all" || e.category === cat);

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="The only information the AI is allowed to tell customers. Services and prices come from the Services page."
        actions={canEdit && <Button variant="primary" onClick={() => setEdit("new")}><Plus size={16} /> Add answer</Button>}
      />
      <div className="grid gap-8 px-4 py-6 md:px-8 xl:grid-cols-[1fr_380px]">
        <section aria-label="Approved answers">
          <div role="tablist" aria-label="Category" className="mb-4 flex flex-wrap gap-1">
            {[["all", "All"] as const, ...categories].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={cat === k} onClick={() => setCat(k)} className={cx("rounded-md px-3 py-1.5 text-[13.5px]", cat === k ? "bg-surface-2 font-medium" : "text-muted hover:bg-surface hover:text-ink")}>
                {label}
                {k !== "all" && <span className="ml-1.5 text-muted">{entries.filter((e) => e.category === k).length}</span>}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="rounded-lg border border-line">
              <EmptyState icon={<BookOpen size={20} />} title="Nothing here yet" body="Add the answers your staff give most often. The AI will only use what's written here." action={canEdit && <Button onClick={() => setEdit("new")}>Add answer</Button>} />
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {shown.map((e) => (
                <li key={e.id} className={cx("px-5 py-4", !e.active && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-medium">{e.question}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink/80">{e.answer}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge>{catLabel[e.category] ?? e.category}</Badge>
                        {!e.active && <Badge tone="outline">Not used by AI</Badge>}
                      </div>
                    </div>
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => setEdit(e)}>Edit</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <TestPanel />
      </div>
      {edit && <EntryDialog entry={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function TestPanel() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ q: string; answer: string; source: { title: string } | null; confident: boolean } | null>(null);
  const [busy, start] = useTransition();
  return (
    <aside aria-labelledby="test-h" className="h-fit rounded-lg border border-line xl:sticky xl:top-6">
      <div className="border-b border-line px-5 py-3">
        <h2 id="test-h" className="flex items-center gap-2 text-[15px] font-semibold"><FlaskConical size={16} /> Test an answer</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">Ask what a customer would ask. See the reply and where it came from.</p>
      </div>
      <form
        className="flex gap-2 px-5 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const question = q;
          start(async () => {
            const r = await testKnowledge(question);
            if (r.ok && r.data) setRes({ q: question, ...r.data });
            else if (!r.ok) toast.error(r.error);
          });
        }}
      >
        <label htmlFor="kt" className="sr-only">Customer question</label>
        <Input id="kt" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Do you have parking?" />
        <Button type="submit" variant="primary" aria-label="Ask" loading={busy}>{!busy && <SendHorizontal size={16} />}</Button>
      </form>
      <div className="px-5 py-4" aria-live="polite">
        {!res ? (
          <p className="text-[13px] text-muted">Answers appear here.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-muted">“{res.q}”</p>
            <p className="rounded-xl rounded-tr-md bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed">{res.answer}</p>
            <p className="text-[12.5px] text-muted">
              Source: {res.source ? <span className="text-ink">{res.source.title}</span> : <span>none found, so the reply offers a staff handoff</span>}
            </p>
            <p className="rounded-md bg-warn-soft/60 px-3 py-2 text-[12px] text-warn-ink">
              Development mode: answered by keyword matching, not an AI model. Connect an AI provider in Settings for natural replies.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function EntryDialog({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const [v, setV] = useState({ category: entry?.category ?? "faq", question: entry?.question ?? "", answer: entry?.answer ?? "", active: entry?.active ?? true });
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  return (
    <Dialog open onClose={onClose} title={entry ? "Edit answer" : "Add answer"} wide>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveKnowledge(entry?.id ?? null, v as Parameters<typeof saveKnowledge>[1]);
            if (r.ok) {
              toast.ok("Answer saved.");
              onClose();
            } else setError(r.error);
          });
        }}
      >
        <Field label="Category" htmlFor="k-cat">
          <Select id="k-cat" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Customer question" htmlFor="k-q">
          <Input id="k-q" value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} maxLength={200} required />
        </Field>
        <Field label="Approved answer" htmlFor="k-a" hint="Write it the way you'd want it said to a customer.">
          <Textarea id="k-a" value={v.answer} onChange={(e) => setV({ ...v, answer: e.target.value })} maxLength={1500} required className="min-h-[120px]" />
        </Field>
        <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5">
          <span className="text-[14px]">AI can use this answer</span>
          <Switch checked={v.active} onChange={(x) => setV({ ...v, active: x })} label="AI can use this answer" />
        </div>
        {error && <p role="alert" className="text-[13.5px] text-[#9b3b2b]">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-2">
          {entry ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (!confirm("Delete this answer? The AI will stop using it.")) return;
                start(async () => {
                  const r = await deleteKnowledge(entry.id);
                  if (r.ok) {
                    toast.ok("Answer deleted.");
                    onClose();
                  } else setError(r.error);
                });
              }}
            >
              <Trash2 size={15} /> Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>Save answer</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
