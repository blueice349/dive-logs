import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import UserProfilePage from "@/app/components/UserProfilePage";

export default async function UserProfileRoute() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <UserProfilePage user={user} />;
}
