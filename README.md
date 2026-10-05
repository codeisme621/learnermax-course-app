# learnermax-course-app
A fully open source Course application that is modern and hackable

**The app lives in [`frontend/`](frontend/README.md)** (Next.js on Vercel + Neon Postgres + Better Auth +
Stripe + SES). Start with `frontend/README.md` for setup and the local runbook, and `VERCEL_ENV_SETUP.md` for
deployment configuration. `backend/` is the retired Express/Lambda/DynamoDB API, kept until the legacy AWS
stack is decommissioned.

## Setup

### Monorepo Configuration

This is a monorepo with the frontend in the `frontend/` directory. For tools that expect configuration files in the root (like the shadcn MCP server), a symlink is used:

```bash
ln -s frontend/components.json components.json
```

This allows the shadcn MCP server to detect registries (@shadcn, @originui) configured in `frontend/components.json`.
