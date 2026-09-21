import { notFound } from "next/navigation";
import { ProfileEditor } from "@/components/platform/profile-editor";
export default async function ProfilePage({ params: pendingParams }) {
  const params = await pendingParams;
  if (
    !["student", "industry", "academician", "institution"].includes(params.role)
  )
    notFound();
  return <ProfileEditor role={params.role} />;
}
