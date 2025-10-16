import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companyUser } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CompanyProfileDashboard } from "@/components/profile/CompanyProfileDashboard";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: new Headers() });

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get user's company associations
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

  const companyId = userCompanies[0].companyId;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Company Profile</h1>
        <p className="text-muted-foreground">
          Manage your healthcare company's profile, documents, and settings
        </p>
      </div>
      <CompanyProfileDashboard companyId={companyId} />
    </div>
  );
}