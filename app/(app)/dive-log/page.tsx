import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import DiveLogPage from "@/app/components/DiveLogPage";

export default async function DiveLogRoute() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <DiveLogPage user={user} />;
}
