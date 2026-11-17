// A9 — Content and settings the admin can change without a developer.
import { prisma } from "@/lib/db";
import { currentSession, updateSetting } from "@/lib/actions";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function AdminSettings() {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  return (<div><h1>Settings</h1>
    {settings.map((s) => (
      <div className="card" key={s.key}>
        <form action={async (f: FormData) => { "use server"; await updateSetting(s.key, String(f.get("value") || "")); }}>
          <label>{s.key}</label>
          <input name="value" defaultValue={s.value} />
          <button type="submit">Save</button>
        </form>
      </div>
    ))}
    <p>Changes are audit-logged and show who changed them. Gateway fees are a ReEat cost by default — the partner keeps a full 80% — unless a written partner agreement says otherwise.</p>
  </div>);
}
