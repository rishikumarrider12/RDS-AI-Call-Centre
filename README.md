# RDS AI Call Centre Monorepo

Production-ready, AI-powered call centre platform for Rishi Digital Solutions (RDS).

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4, Shadcn UI, TanStack Query
- **Backend**: Node.js, Express, TypeScript, Supabase, PostgreSQL
- **Infrastructure**: Docker, Docker Compose, GitHub Actions

## Quick Start

\1. Clone the repository\2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`\3. Configure environment:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`\4. Start development:
   \`\`\`bash
   npm run dev
   \`\`\`\5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Workspaces

- \`apps/web\` - Next.js frontend application
- \`apps/api\` - Express backend API
- \`packages/ui\` - Shared UI components
- \`packages/types\` - Shared TypeScript types
- \`packages/config\` - Shared ESLint / Tailwind configs
- \`packages/utils\` - Shared utility functions

## Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Run both web and api in development |
| \`npm run dev:web\` | Run frontend only |
| \`npm run dev:api\` | Run backend only |
| \`npm run build\` | Build all workspaces |
| \`npm run lint\` | Run ESLint across all workspaces |
| \`npm run clean\` | Remove build artifacts |

## Documentation

- [Project Status](./PROJECT_STATUS.md)
- [Development Roadmap](./DEVELOPMENT_ROADMAP.md)
- [Task List](./TASKS.md)
- [Build Report](./BUILD_REPORT.md)

## Docker

\`\`\`bash
docker compose -f docker/docker-compose.yml up -d
\`\`\`

## License

Proprietary - Rishi Digital Solutions
