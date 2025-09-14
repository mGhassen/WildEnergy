import { useMemo } from 'react';

interface TermsReAcceptanceParams {
  user: any;
  onboardingStatus: any;
  currentTerms: any;
}

export function useTermsReAcceptance({ user, onboardingStatus, currentTerms }: TermsReAcceptanceParams) {
  return useMemo(() => {
    // If no user or data not loaded, return false
    if (!user?.member_id || !onboardingStatus?.data || !currentTerms) {
      console.log('Terms re-acceptance check: Missing data', {
        hasUser: !!user?.member_id,
        hasOnboardingStatus: !!onboardingStatus?.data,
        hasCurrentTerms: !!currentTerms
      });
      return false;
    }

    // Check if member's accepted terms version differs from current active terms
    const memberAcceptedVersionId = onboardingStatus.data.terms_version_id;
    const currentActiveTermsId = currentTerms.id;
    
    console.log('Terms re-acceptance check:', {
      memberAcceptedVersionId,
      currentActiveTermsId,
      needsReAcceptance: memberAcceptedVersionId !== currentActiveTermsId,
      onboardingData: onboardingStatus.data,
      currentTermsData: currentTerms
    });
    
    // Only require re-acceptance if:
    // 1. Member has previously accepted terms (has a terms_version_id)
    // 2. AND the version they accepted is different from current active terms
    // This prevents re-acceptance for new members who haven't accepted any terms yet
    return memberAcceptedVersionId && memberAcceptedVersionId !== currentActiveTermsId;
  }, [user?.member_id, onboardingStatus?.data?.terms_version_id, currentTerms?.id]);
}
