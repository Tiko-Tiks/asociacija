import { redirect } from 'next/navigation'
import { listOrgReviewRequests } from '@/app/actions/admin/org-review'
import { OrgReviewRequestsList } from '@/components/admin/org-review-requests-list'

/**
 * Admin: Organization Review Requests
 * 
 * Platform admin interface to review and approve/reject organization registrations
 */
export default async function OrgReviewRequestsPage() {
  // TODO: Add platform admin check
  // For now, allow access (should be protected by middleware or layout)
  
  const requests = await listOrgReviewRequests()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Bendruomenių patvirtinimo užklausos
            </h1>
            <p className="text-slate-600">
              Peržiūrėkite ir patvirtinkite naujų bendruomenių registracijas
            </p>
          </div>

          <OrgReviewRequestsList initialRequests={requests} />
        </div>
      </div>
    </div>
  )
}

