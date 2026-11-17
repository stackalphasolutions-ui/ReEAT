// C9 — Profile and settings (customer).
import { currentSession, signOut } from "@/lib/actions";
import { redirect } from "next/navigation";
export default async function Profile() {
  const session = await currentSession();
  if (!session) redirect("/auth/signin");
  return (<div><h1>Profile</h1><div className="card">
    <p><b>Name:</b> {session.user.fullName || "—"}</p>
    <p><b>Email:</b> {session.user.email || "—"}</p>
    <p><b>Role:</b> {session.user.role}</p>
    <p>Deleting an account does not delete financial records the admin must retain.</p>
    <form action={signOut}><button type="submit">Sign out</button></form>
  </div></div>);
}
