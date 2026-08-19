import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.status !== "approved") redirect("/pending");

  redirect(
    user.role === "admin"
      ? "/admin"
      : user.role === "teacher"
        ? "/teacher"
        : "/dashboard",
  );
}
