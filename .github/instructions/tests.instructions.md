---
applyTo: "**/*.test.{ts,tsx},**/*.spec.{ts,tsx}"
---

## Testing Guidelines

When writing tests for this project, follow these guidelines:

1. **Use Vitest** - This project uses Vitest as the test runner
2. **Testing Library** - Use `@testing-library/react` for component testing
3. **File naming** - Use `.test.ts` or `.test.tsx` extension for test files
4. **Co-locate tests** - Place test files next to the code they test or in `__tests__` directories

### Test Structure Template
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    render(<ComponentName />);
    fireEvent.click(screen.getByRole('button'));
    expect(/* assertion */).toBe(/* expected */);
  });
});
```

### Mocking Guidelines
- Mock external services and APIs using `vi.mock()`
- Use `vi.fn()` for function mocks
- Place shared mocks in `src/test/mocks/`
- Mock sql.js database for data layer tests

### Test Coverage
- Write tests for all new functionality
- Focus on user behavior, not implementation details
- Test edge cases and error states
- Aim for meaningful coverage, not just high numbers
