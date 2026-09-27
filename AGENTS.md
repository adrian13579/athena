# Project guidance

- Use TypeORM entities, relations, repositories, and query builders for application database access. Avoid handwritten SQL in services and repositories when the operation can be expressed with TypeORM.
- Keep SQL in versioned TypeORM migrations for schema creation and changes. Do not enable automatic schema synchronization in application configuration.
- When asked to commit changes, make focused commits by related concern; keep independent changes in separate commits and verify the working tree afterward.

## React best practices

- Prefer functional components and React hooks.
- Keep components small, focused, and composable.
- Separate UI, business logic, and data-access concerns.
- Prefer composition over complex component configuration or inheritance.
- Keep state as local as possible; lift it only when multiple components need it.
- Avoid redundant state. Derive values from existing state or props when possible.
- Use `useEffect` only for synchronizing with external systems, not for derived state or normal event handling.
- Never mutate state directly; use immutable updates.
- Use stable, meaningful `key` values for lists; avoid array indexes when items can change order.
- Prefer controlled, explicit data flow from parent to child.
- Extract reusable behavior into custom hooks.
- Avoid premature `useMemo`, `useCallback`, and `React.memo`; optimize only when there is a demonstrated reason.
- Handle loading, empty, error, and success states explicitly.
- Keep API and network logic outside presentation components when practical.
- Prefer TypeScript with explicit domain types; avoid `any`.
- Follow existing project conventions for component structure, styling, state management, routing, and data fetching.
- Build accessible interfaces using semantic HTML, labels, keyboard support, and appropriate ARIA attributes.
- Do not introduce dependencies when existing project utilities or native browser or React APIs are sufficient.
