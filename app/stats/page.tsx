import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import StatsPage from "@/app/components/StatsPage";

export default async function StatsRoute() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <StatsPage user={user} />;
}
