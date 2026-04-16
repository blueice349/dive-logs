import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import SpeciesAdminPage from "@/app/components/SpeciesAdminPage";

export default async function SpeciesRoute() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dive-log");
  return <SpeciesAdminPage user={user} />;
}
