import { GoalInviteAccept } from "@/components/finance/goal-invite-accept";

export default async function GoalJoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <GoalInviteAccept token={token} />;
}
