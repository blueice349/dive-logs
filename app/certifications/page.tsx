import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import CertificationsPage from "@/app/components/CertificationsPage";

export default async function CertificationsRoute() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <CertificationsPage user={user} />;
}
