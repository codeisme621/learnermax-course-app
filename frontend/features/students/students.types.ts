// REST contract for GET /api/students/me (shape kept from the Express API, minus signUpMethod/meetups).
export interface StudentDTO {
  studentId: string;
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  interestedInPremium: boolean;
  premiumInterestDate?: string;
}

// Response of POST /api/students/early-access.
export interface EarlyAccessDTO {
  success: true;
  message: string;
  student: { studentId: string; interestedInPremium: true; premiumInterestDate: string };
}

/** Identity fields owned by accounts; passed in so students never reads the auth tables. */
export interface StudentIdentity {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}
