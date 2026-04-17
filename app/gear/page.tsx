import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import GearPage from "@/app/components/GearPage";

export default async function GearRoute() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <GearPage user={user} />;
}
