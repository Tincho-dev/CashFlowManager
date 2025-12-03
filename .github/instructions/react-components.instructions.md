---
applyTo: "src/components/**/*.tsx"
---

## React Component Guidelines

When creating or modifying React components, follow these guidelines:

1. **Use functional components** - Always use function components with hooks, not class components
2. **TypeScript props** - Define props interface with proper typing, avoid `any`
3. **Naming conventions** - Use PascalCase for components, camelCase for functions and variables
4. **SCSS modules** - Create a corresponding `.module.scss` file for styles
5. **Material-UI** - Use MUI components and theming for consistency
6. **i18n** - Use `useTranslation` hook for all user-facing text
7. **Accessibility** - Include ARIA labels and keyboard navigation support
8. **Keep components focused** - Single responsibility principle

### Component Structure Template
```tsx
import { useTranslation } from 'react-i18next';
import styles from './ComponentName.module.scss';

interface ComponentNameProps {
  // Define typed props
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  const { t } = useTranslation();
  
  return (
    <div className={styles.container}>
      {/* Component content */}
    </div>
  );
}
```

### Hooks Usage
- Use `useState` for local state
- Use `useContext` for shared state from context providers
- Extract complex logic into custom hooks in `src/hooks/`
- Use `useCallback` and `useMemo` for optimization when needed
