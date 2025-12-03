# CashFlow Manager - Copilot Instructions

This is a React 19 + TypeScript personal finance management application with SQLite (sql.js) for browser-based data persistence. It's a Progressive Web App (PWA) that works offline-first.

## Code Standards

### Required Before Each Commit
- Run `npm run lint` before committing any changes to ensure code quality
- Run `npm run build` to verify TypeScript compilation succeeds
- Run `npm test` to ensure all tests pass

### Development Flow
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm test`
- Test with coverage: `npm run test:coverage`

## Repository Structure
- `src/components/` - React UI components organized by feature
  - `layout/` - Layout components (Header, Sidebar, BottomNavigation)
  - `accounts/` - Account-related components
  - `chatbot/` - AI chatbot interface
  - `common/` - Shared reusable components
- `src/pages/` - Route-level page components
- `src/data/` - Data layer (database and repositories)
  - `database.ts` - SQLite initialization and migrations
  - `repositories/` - Data access layer with CRUD operations
- `src/services/` - Business logic layer
- `src/contexts/` - React context providers for state management
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions
- `src/i18n/` - Internationalization (English and Spanish)
- `src/test/` - Test setup and mocks

## Key Guidelines

### General Principles
1. Follow React 19 best practices and hooks patterns
2. Use TypeScript strictly - avoid `any` types
3. Maintain existing code structure and organization
4. Write unit tests for new functionality using Vitest
5. Support both English and Spanish via i18n

### Styling Rules
- **All styles must be SCSS modules** - Create `.module.scss` files
- Never use inline styles in `.tsx` files (except for dynamic values)
- Use camelCase or BEM naming convention for CSS classes
- Use Material-UI (MUI) v7 components and theming system

### Component Guidelines
- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks in `src/hooks/`
- Use React context for shared state management

### Data Layer Guidelines
- All database operations go through repositories in `src/data/repositories/`
- Services in `src/services/` contain business logic and call repositories
- Use TypeScript interfaces from `src/types/` for all data structures

### Testing Guidelines
- Use Vitest for unit testing
- Use `@testing-library/react` for component testing
- Place test setup in `src/test/setup.ts`
- Test files should be co-located with components or in `__tests__` directories

### Accessibility
- Include proper ARIA labels
- Support keyboard navigation
- Follow WCAG guidelines

### PWA Considerations
- Application works offline-first
- Data is stored locally in browser using sql.js
- Consider offline scenarios when implementing features
