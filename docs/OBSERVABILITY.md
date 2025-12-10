# LearnerMax Observability Guide

This document explains how to view and interpret business and technical metrics for LearnerMax.

## Overview

LearnerMax uses two observability platforms:

| Platform | Purpose | Best For |
|----------|---------|----------|
| **Vercel Analytics** | Frontend user behavior | Landing page views, CTA clicks, signup attempts |
| **AWS CloudWatch** | Backend events & technical metrics | Actual signups, enrollments, completions, API health |

---

## Accessing Dashboards

### Vercel Analytics
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project (learnermax-course-app)
3. Click **Analytics** tab
4. Use time filters (24h, 7d, 30d, custom)

### CloudWatch Dashboard
1. Go to [AWS Console → CloudWatch → Dashboards](https://console.aws.amazon.com/cloudwatch/home#dashboards:)
2. Select **LearnerMax-Observability-{env}** (preview or prod)
3. Use time filters in top-right corner

---

## Business Metrics

### Conversion Funnel

```
Landing Page Views → CTA Clicks → Signup Attempts → Actual Signups → Enrollments → Completions → Premium Interest
     (Vercel)        (Vercel)       (Vercel)        (CloudWatch)    (CloudWatch)  (CloudWatch)   (CloudWatch)
```

### Metric Details

| Stage | Platform | Metric Name | How to Find |
|-------|----------|-------------|-------------|
| Landing page views | Vercel | Page views on `/` | Analytics → Top Pages → `/` |
| CTA clicks | Vercel | `cta_clicked` | Analytics → Custom Events → `cta_clicked` |
| Signup attempts (email only) | Vercel | `signup_started` | Analytics → Custom Events → `signup_started` |
| **Actual signups** | CloudWatch | `UserRegistrationSuccess` | Dashboard → "User Registrations" widget |
| Enrollments | CloudWatch | `EnrollmentSuccess` | Dashboard → "Daily Signups & Enrollments" widget |
| Course completions | CloudWatch | `CourseCompletionSuccess` | Dashboard → "Daily Course Completions" widget |
| Premium interest | CloudWatch | `PremiumEarlyAccessSignup` | Dashboard → "Premium Early Access Signups" widget |

### Calculating Conversion Rates

#### Landing → Signup Attempt (Email only)
- **Source**: Vercel Analytics
- **Formula**: `signup_started` / page views on `/` × 100
- **Note**: Only captures email signups, not Google OAuth

#### Signup Attempt → Actual Signup (Email only)
- **Sources**: Vercel + CloudWatch
- **Formula**: `UserRegistrationSuccess` / `signup_started` × 100
- **How**: Export Vercel data, compare with CloudWatch metric for same period

#### Signup → Enrollment
- **Source**: CloudWatch (automatic)
- **View**: Dashboard → "Conversion: Signup to Enrollment %" widget

#### Enrollment → Completion
- **Source**: CloudWatch
- **Formula**: `CourseCompletionSuccess` / `EnrollmentSuccess` × 100
- **How**: Compare metrics for the same time period

#### Completion → Premium Interest
- **Source**: CloudWatch
- **Formula**: `PremiumEarlyAccessSignup` / `CourseCompletionSuccess` × 100

---

## Important Notes

### Google OAuth Tracking Limitation

**Google sign-in does NOT trigger `signup_started`** because we cannot distinguish between:
- A new user signing up for the first time
- An existing user signing back in

**Impact**: The `signup_started` metric only reflects email signup attempts.

**Solution**: Use CloudWatch `UserRegistrationSuccess` as your source of truth for total signups. This metric fires exactly once per new user, regardless of signup method (email or Google).

### Signup Method Breakdown

To see signup method distribution:
1. Go to CloudWatch Logs Insights
2. Query the `student-onboarding` Lambda logs
3. Filter by `signUpMethod: 'email'` or `signUpMethod: 'google'`

Or check the DynamoDB `Students` table - each record has a `signUpMethod` field.

---

## Technical Metrics

### API Health

| Metric | Widget | What It Shows |
|--------|--------|---------------|
| `ApiLatency` (p50/p90/p99) | "API Latency" | Response time distribution in milliseconds |
| `Http4xxCount` | "HTTP Error Counts" | Client errors (bad requests, unauthorized, not found) |
| `Http5xxCount` | "HTTP Error Counts" | Server errors (internal errors, timeouts) |

### Healthy Ranges

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| p50 latency | < 100ms | 100-300ms | > 300ms |
| p99 latency | < 500ms | 500ms-1s | > 1s |
| 4xx rate | < 5% | 5-10% | > 10% |
| 5xx rate | < 0.1% | 0.1-1% | > 1% |

### Other Technical Widgets

| Widget | Purpose |
|--------|---------|
| Lambda Errors | Tracks errors across all Lambda functions |
| Lambda Duration | Average execution time per function |
| Dead Letter Queue | Failed async events (should be 0) |
| DynamoDB Operations | Database write success/failure |
| SNS Publishing | Event publishing success/failure |

---

## Quick Reference: Where to Look

| Question | Where to Look |
|----------|---------------|
| How many people visited today? | Vercel → Analytics → Unique Visitors |
| How many clicked "Enroll Now"? | Vercel → Custom Events → `cta_clicked` |
| How many actually signed up? | CloudWatch → "User Registrations" widget |
| What's my signup conversion rate? | Compare Vercel page views to CloudWatch signups |
| How many finished the course? | CloudWatch → "Daily Course Completions" widget |
| Is the API healthy? | CloudWatch → "API Latency" + "HTTP Error Counts" widgets |
| Are there any errors? | CloudWatch → "Lambda Errors" widget |

---

## Exporting Data

### Vercel Analytics
- Click any panel → Export icon → CSV (up to 250 entries)
- For larger exports: Use Vercel Drains (Pro plan, $0.50/GB)

### CloudWatch Metrics
- In any widget → Actions → Download as CSV
- Or use AWS CLI: `aws cloudwatch get-metric-data`

---

## Setting Up Alerts (Future)

Currently alerts are not configured. When ready:

1. **CloudWatch Alarms**: Add to `template.yaml` for metrics like:
   - High 5xx error rate
   - p99 latency exceeds threshold
   - DLQ messages > 0

2. **Destination**: Configure SNS topic → Email/Slack
