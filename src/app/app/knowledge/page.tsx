import { requireBusiness, can } from "@/server/context";
import { knowledge } from "@/server/queries";
import { KnowledgeManager } from "@/components/knowledge/knowledge-manager";

export const metadata = { title: "Knowledge · Reception" };

export default async function KnowledgePage() {
  const { business, role } = await requireBusiness();
  const entries = await knowledge(business);
  return (
    <KnowledgeManager
      canEdit={can(role, "knowledge:manage")}
      entries={entries.map((e) => ({ id: e.id, category: e.category, question: e.question, answer: e.answer, active: e.active }))}
    />
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
