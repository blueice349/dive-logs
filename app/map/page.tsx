import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import MapPage from "@/app/components/MapPage";

export default async function MapRoute() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <MapPage user={user} />;
}
