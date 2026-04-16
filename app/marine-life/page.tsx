import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import MarineLifePage from "@/app/components/MarineLifePage";

export default async function MarineLifeRoute() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <MarineLifePage user={user} />;
}
