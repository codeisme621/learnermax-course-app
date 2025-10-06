# learnermax-course-app
A fully open source Course application that is modern and hackable

## Setup

### Monorepo Configuration

This is a monorepo with the frontend in the `frontend/` directory. For tools that expect configuration files in the root (like the shadcn MCP server), a symlink is used:

```bash
ln -s frontend/components.json components.json
```

This allows the shadcn MCP server to detect registries (@shadcn, @originui) configured in `frontend/components.json`.
