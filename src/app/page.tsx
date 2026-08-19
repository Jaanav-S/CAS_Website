import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.status !== "approved") redirect("/pending");

  const home: Record<string, string> = {
    admin: "/admin",
    supervisor: "/supervisor",
    teacher: "/teacher",
    student: "/dashboard",
  };
  redirect(home[user.role] ?? "/dashboard");
}
