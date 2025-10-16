import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companyUser } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import BuyerDashboard from "@/components/buyer/BuyerDashboard";
import { MarketplaceDashboard } from "@/components/marketplace/MarketplaceDashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: new Headers() });

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get user's company associations and role
  const userCompanies = await db
    .select({
      companyId: companyUser.companyId,
      role: companyUser.role,
      isPrimaryContact: companyUser.isPrimaryContact,
    })
    .from(companyUser)
    .where(eq(companyUser.userId, session.user.id))
    .limit(1);

  if (!userCompanies.length) {
    // User is not associated with any company
    redirect("/auth/register/company");
  }

  const { companyId, role } = userCompanies[0];

  // Role-based dashboard rendering
  if (role === "buyer" || role === "purchaser") {
    return <BuyerDashboard />;
  } else if (role === "seller" || role === "supplier") {
    return <MarketplaceDashboard />;
  } else {
    // Default to buyer dashboard for other roles
    return <BuyerDashboard />;
  }
}
