import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import AdminPage from "@/app/components/AdminPage";

export default async function AdminRoute() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dive-log");

  return <AdminPage currentUser={user} />;
}
