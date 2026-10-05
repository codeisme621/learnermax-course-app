/**
 * Facts the legal pages depend on. Review these with your own counsel; change them here, in one place.
 * - operator:       the legal entity that sells the course (e.g. your Stripe Atlas company's exact name)
 * - contactEmail:   must be an inbox you actually read (refunds and privacy requests arrive here)
 * - governingLaw:   usually the state your company is formed in (Atlas companies are Delaware entities)
 */
// Confirmed by the owner (2026-10-05): LearnerMax, LLC, a Delaware LLC; it is the Stripe merchant of record.
export const LEGAL = {
  operator: 'LearnerMax, LLC (doing business as LearnWithRico)',
  site: 'learnwithrico.com',
  contactEmail: 'support@learnwithrico.com',
  governingLaw: 'the State of Delaware, United States',
  refundWindowDays: 30,
  lastUpdated: 'October 5, 2026',
} as const;
