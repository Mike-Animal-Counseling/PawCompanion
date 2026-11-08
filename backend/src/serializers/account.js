import { toId } from '../lib/ids.js';

export function serializeAccount(account) {
  const base = {
    id: toId(account),
    role: account.role,
    name: account.name,
    email: account.email,
    status: account.status,
    createdAt: account.createdAt,
  };
  if (account.role === 'customer') {
    return {
      ...base,
      phone: account.phone || '',
      city: account.city || '',
      avatarColor: account.avatarColor || '#2f6b52',
      safetyConsentAt: account.safetyConsentAt,
      marketingOptIn: Boolean(account.marketingOptIn),
      goals: account.goals || [],
      preferredSpecies: account.preferredSpecies || '',
      timezone: account.timezone || '',
      onboardingComplete: Boolean(account.onboardingComplete),
      plusMember: Boolean(account.plusMember),
    };
  }
  if (account.role === 'merchant') {
    return {
      ...base,
      businessType: account.businessType,
      city: account.city || '',
      description: account.description || '',
      website: account.website || '',
      logoUrl: account.logoUrl || '',
      verified: Boolean(account.verified),
      ratingAverage: account.ratingAverage || 0,
      reviewCount: account.reviewCount || 0,
    };
  }
  return base;
}

export function serializeMerchantPublic(merchant) {
  if (!merchant) return null;
  return {
    id: toId(merchant),
    name: merchant.name,
    businessType: merchant.businessType,
    city: merchant.city || '',
    description: merchant.description || '',
    website: merchant.website || '',
    logoUrl: merchant.logoUrl || '',
    verified: Boolean(merchant.verified),
    ratingAverage: merchant.ratingAverage || 0,
    reviewCount: merchant.reviewCount || 0,
  };
}
