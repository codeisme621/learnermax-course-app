/**
 * Facts the legal pages depend on. Review these with your own counsel; change them here, in one place.
 * - operator:       the legal entity that sells the course (e.g. your Stripe Atlas company's exact name)
 * - contactEmail:   must be an inbox you actually read (refunds and privacy requests arrive here)
 * - governingLaw:   usually the state your company is formed in (Atlas companies are Delaware entities)
 */
export const LEGAL = {
  operator: 'LearnWithRico',
  site: 'learnwithrico.com',
  contactEmail: 'hello@learnwithrico.com',
  governingLaw: 'the State of Delaware, United States',
  refundWindowDays: 30,
  lastUpdated: 'October 5, 2026',
} as const;
