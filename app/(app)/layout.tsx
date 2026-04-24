import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import AppHeader from "@/app/components/AppHeader";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <>
      <AppHeader user={user} />
      {children}
    </>
  );
}
