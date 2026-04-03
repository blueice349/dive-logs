import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";

export default async function Home() {
  const user = await getSession();
  redirect(user ? "/dive-log" : "/login");
}
