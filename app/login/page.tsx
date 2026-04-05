import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import AuthForm from "@/app/components/AuthForm";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/dive-log");

  return <AuthForm />;
}
