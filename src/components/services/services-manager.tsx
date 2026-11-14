"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink, Plus, Scissors, UserRound } from "lucide-react";
import { Avatar, Badge, Button, Dialog, EmptyState, Field, Input, PageHeader, Switch, Textarea, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { saveService, saveStaff } from "@/server/actions";
import { peso } from "@/lib/time";

interface Svc { id: string; name: string; description: string; durationMinutes: number; bufferMinutes: number; price: number; active: boolean; staffIds: string[] }
interface Staff { id: string; name: string; title: string; active: boolean }

export function ServicesManager({ services, staff, canEdit, bookingUrl }: { services: Svc[]; staff: Staff[]; canEdit: boolean; bookingUrl: string }) {
  const [editSvc, setEditSvc] = useState<Svc | "new" | null>(null);
  const [editStaff, setEditStaff] = useState<Staff | "new" | null>(null);
  const staffName = (id: string) => staff.find((s) => s.id === id)?.name.split(" ")[0] ?? "";

  return (
    <div>
      <PageHeader
        title="Services"
        description="What customers can book, how long it takes, and who does it."
        actions={
          <>
            <Link href={bookingUrl} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-[14.5px] hover:bg-surface">
              Booking page <ExternalLink size={15} />
            </Link>
            {canEdit && (
              <Button variant="primary" onClick={() => setEditSvc("new")}>
                <Plus size={16} /> New service
              </Button>
            )}
          </>
        }
      />
      {!canEdit && <p className="mx-4 mt-4 rounded-md bg-surface px-3 py-2 text-[13.5px] text-muted md:mx-8">Only owners and managers can change services.</p>}
      <div className="space-y-10 px-4 py-6 md:px-8">
        <section aria-label="Services">
          {services.length === 0 ? (
            <div className="rounded-lg border border-line">
              <EmptyState icon={<Scissors size={20} />} title="No services yet" body="Add your first service so customers can book it." action={canEdit && <Button variant="primary" onClick={() => setEditSvc("new")}>Add a service</Button>} />
            </div>
          ) : (
            <>
            {/* Phones: stacked list instead of a sideways-scrolling table */}
            <ul className="divide-y divide-line rounded-lg border border-line md:hidden">
              {services.map((s) => (
                <li key={s.id} className={cx("flex items-start gap-3 px-4 py-3 text-[14px]", !s.active && "text-muted")}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-[13px] text-muted">
                      {s.durationMinutes} min{s.bufferMinutes ? ` + ${s.bufferMinutes} buffer` : ""} · {peso(Math.round(s.price * 100))} · {s.staffIds.length ? s.staffIds.map(staffName).join(", ") : "No staff"}
                    </span>
                    <Badge tone={s.active ? "accent" : "outline"} className="mt-1.5">{s.active ? "Bookable" : "Hidden"}</Badge>
                  </span>
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => setEditSvc(s)}>Edit</Button>}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead className="border-b border-line bg-surface/60 text-[12.5px] text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Service</th>
                    <th className="px-4 py-2.5 font-medium">Duration</th>
                    <th className="px-4 py-2.5 font-medium">Price</th>
                    <th className="px-4 py-2.5 font-medium">Staff</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {services.map((s) => (
                    <tr key={s.id} className={cx(!s.active && "text-muted")}>
                      <td className="px-4 py-3">
                        <span className="font-medium">{s.name}</span>
                        {s.description && <span className="block max-w-[320px] truncate text-[12.5px] text-muted">{s.description}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">{s.durationMinutes} min{s.bufferMinutes ? <span className="text-muted"> + {s.bufferMinutes} buffer</span> : null}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{peso(Math.round(s.price * 100))}</td>
                      <td className="px-4 py-3">{s.staffIds.length ? s.staffIds.map(staffName).join(", ") : <Badge tone="warn">No staff</Badge>}</td>
                      <td className="px-4 py-3"><Badge tone={s.active ? "accent" : "outline"}>{s.active ? "Bookable" : "Hidden"}</Badge></td>
                      <td className="px-4 py-3 text-right">{canEdit && <Button size="sm" variant="ghost" onClick={() => setEditSvc(s)}>Edit</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <section aria-labelledby="staff-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="staff-h" className="text-[16px] font-semibold">Staff</h2>
            {canEdit && <Button size="sm" onClick={() => setEditStaff("new")}><Plus size={15} /> Add staff</Button>}
          </div>
          {staff.length === 0 ? (
            <div className="rounded-lg border border-line"><EmptyState icon={<UserRound size={20} />} title="No staff yet" body="Add the people who perform your services." /></div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-lg border border-line px-4 py-3">
                  <Avatar name={s.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium">{s.name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {s.title || "Staff"} · {services.filter((v) => v.staffIds.includes(s.id)).length} services
                    </span>
                  </span>
                  {!s.active && <Badge tone="outline">Inactive</Badge>}
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => setEditStaff(s)}>Edit</Button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editSvc && <ServiceDialog svc={editSvc === "new" ? null : editSvc} staff={staff} onClose={() => setEditSvc(null)} />}
      {editStaff && <StaffDialog s={editStaff === "new" ? null : editStaff} onClose={() => setEditStaff(null)} />}
    </div>
  );
}

function ServiceDialog({ svc, staff, onClose }: { svc: Svc | null; staff: Staff[]; onClose: () => void }) {
  const [v, setV] = useState<Omit<Svc, "id">>(
    svc ?? { name: "", description: "", durationMinutes: 60, bufferMinutes: 0, price: 0, active: true, staffIds: staff.filter((s) => s.active).map((s) => s.id) },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  return (
    <Dialog open onClose={onClose} title={svc ? "Edit service" : "New service"} wide>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveService(svc?.id ?? null, v);
            if (r.ok) {
              toast.ok(svc ? "Service updated." : "Service added.");
              onClose();
            } else setError(r.error);
          });
        }}
      >
        <Field label="Name" htmlFor="sv-name">
          <Input id="sv-name" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Description" htmlFor="sv-desc" hint="Customers see this on the booking page. The AI may quote it.">
          <Textarea id="sv-desc" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={400} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Duration (min)" htmlFor="sv-dur">
            <Input id="sv-dur" type="number" min={5} max={600} step={5} value={v.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} />
          </Field>
          <Field label="Buffer after (min)" htmlFor="sv-buf" hint="Cleanup time">
            <Input id="sv-buf" type="number" min={0} max={240} step={5} value={v.bufferMinutes} onChange={(e) => set("bufferMinutes", Number(e.target.value))} />
          </Field>
          <Field label="Price (₱)" htmlFor="sv-price">
            <Input id="sv-price" type="number" min={0} step="0.01" value={v.price} onChange={(e) => set("price", Number(e.target.value))} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-[13.5px] font-medium">Who can do this service</legend>
          {staff.length === 0 ? (
            <p className="text-[13px] text-muted">Add staff first. A service with no staff can&apos;t be booked.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staff.map((s) => {
                const on = v.staffIds.includes(s.id);
                return (
                  <label key={s.id} className={cx("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[13.5px]", on ? "border-accent bg-accent-soft/60" : "border-line")}>
                    <input type="checkbox" className="accent-primary" checked={on} onChange={() => set("staffIds", on ? v.staffIds.filter((x) => x !== s.id) : [...v.staffIds, s.id])} />
                    {s.name}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5">
          <span className="text-[14px]">Bookable by customers</span>
          <Switch checked={v.active} onChange={(x) => set("active", x)} label="Bookable by customers" />
        </div>
        {error && <p role="alert" className="text-[13.5px] text-danger-ink">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving}>Save service</Button>
        </div>
      </form>
    </Dialog>
  );
}

function StaffDialog({ s, onClose }: { s: Staff | null; onClose: () => void }) {
  const [v, setV] = useState({ name: s?.name ?? "", title: s?.title ?? "", active: s?.active ?? true });
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  return (
    <Dialog open onClose={onClose} title={s ? "Edit staff member" : "Add staff member"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveStaff(s?.id ?? null, v);
            if (r.ok) {
              toast.ok("Staff saved.");
              onClose();
            } else setError(r.error);
          });
        }}
      >
        <Field label="Name" htmlFor="st-name">
          <Input id="st-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required minLength={2} />
        </Field>
        <Field label="Role or title" htmlFor="st-title" hint="For example: Senior stylist">
          <Input id="st-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5">
          <span className="text-[14px]">Taking bookings</span>
          <Switch checked={v.active} onChange={(x) => setV({ ...v, active: x })} label="Taking bookings" />
        </div>
        {error && <p role="alert" className="text-[13.5px] text-danger-ink">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving}>Save</Button>
        </div>
      </form>
    </Dialog>
  );
}
