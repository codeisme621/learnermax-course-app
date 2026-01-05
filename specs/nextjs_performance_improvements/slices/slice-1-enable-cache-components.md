# Slice 1: Enable Cache Components + Config

## Objective

Enable Next.js 16 Cache Components feature by adding `cacheComponents: true` to next.config.ts.

## Files to Modify

| File | Change |
|------|--------|
| `frontend/next.config.ts` | Add `cacheComponents: true` |

## Implementation

### BEFORE (Today)

```typescript
// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

### AFTER (Tomorrow)

```typescript
// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

## Cache Profiles

The built-in cache profiles available after enabling:

| Profile | stale | revalidate | expire | Use Case |
|---------|-------|------------|--------|----------|
| `'default'` | 5 min | 15 min | 1 year | Standard content |
| `'seconds'` | 30s | 1s | 1 min | Real-time data |
| `'minutes'` | 5 min | 1 min | 1 hour | Frequently updated |
| `'hours'` | 5 min | 1 hour | 1 day | Multiple daily updates |
| `'days'` | 5 min | 1 day | 1 week | Daily updates |
| `'weeks'` | 5 min | 1 week | 30 days | Weekly updates |
| `'max'` | 5 min | 30 days | 1 year | Rarely changes |

## Acceptance Criteria

- [ ] `cacheComponents: true` added to next.config.ts
- [ ] Dev server starts without errors
- [ ] Build succeeds with new config

## Notes

- This is a prerequisite for all other slices
- No functional changes yet - just enabling the feature
- Custom cache profiles can be added later if needed
