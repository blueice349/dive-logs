import { notFound } from "next/navigation";
import { getPublicProfile } from "@/app/api/store";
import PublicProfilePage from "@/app/components/PublicProfilePage";

export default async function ShareRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profile = await getPublicProfile(token);
  if (!profile) notFound();
  return <PublicProfilePage profile={profile} />;
}
