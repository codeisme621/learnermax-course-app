export interface Student {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  signUpMethod?: 'email' | 'google';
  createdAt: string;
  updatedAt: string;
  // Premium early access fields
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
}
