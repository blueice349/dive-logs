import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import { toPublicUser } from "@/app/types/user";
import MarineLifePage from "@/app/components/MarineLifePage";

export default async function Page() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <MarineLifePage user={user} />;
}
