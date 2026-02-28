# React Component Conventions

## Component Definition

All React components must be defined using `const` + arrow function. Do NOT use `function` declarations.

```tsx
// ✅ Correct
const MyComponent = () => {
  return <div>hello</div>;
};

// ❌ Wrong
function MyComponent() {
  return <div>hello</div>;
}

// ❌ Wrong
export default function MyComponent() {
  return <div>hello</div>;
}
```

## Export Style

- **Default export**: Define the component first, then export at the bottom of the file.
- **Named export**: Use `export` directly on the declaration.

```tsx
// ✅ Default export — export at the bottom
const MyPage = () => {
  return <div>page</div>;
};

export default MyPage;

// ✅ Named export — export inline
export const MyComponent = () => {
  return <div>component</div>;
};
```

## One Component Per File

Each file should contain at most **one** React component definition.

If a component has sub-components only used by itself, convert the file into a **directory**:

```
# Before
features/admin/llm/provider-sidebar.tsx   ← contains ProviderSidebar + ProviderItem

# After
features/admin/llm/provider-sidebar/
├── index.tsx          ← ProviderSidebar (main component)
└── provider-item.tsx  ← ProviderItem (sub-component)
```

- The main component goes in `index.tsx` so the import path stays the same.
- Sub-components go in separate files within the directory.
