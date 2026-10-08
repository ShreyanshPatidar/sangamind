---
name: accessibility-wcag22
description: Ensure WCAG 2.2 Level AA accessibility compliance for web applications including keyboard navigation, screen readers, ARIA attributes, color contrast, and focus management. Use when user mentions accessibility, a11y, WCAG, screen readers, keyboard navigation, or compliance requirements.
allowed-tools: Read, Grep, Glob, Edit
version: 1.0.0
updated: 2025-12-28
---

# Accessibility (WCAG 2.2) Skill

Ensure this Next.js application meets WCAG 2.2 Level AA standards (ISO/IEC 40500:2025).

## WCAG 2.2 Status (December 2025)

- **Published**: W3C Recommendation (Oct 5, 2023, updated Dec 12, 2024)
- **ISO Standard**: ISO/IEC 40500:2025 (approved Oct 21, 2025)
- **Legal Requirement**: UK Public Sector Bodies require WCAG 2.2 Level AA minimum
- **9 New Success Criteria** added since WCAG 2.1

## Quick Accessibility Checklist

### Level A (Must Have)
- [ ] Keyboard accessible (all functionality)
- [ ] Text alternatives for images
- [ ] Captions for audio/video
- [ ] Logical heading structure (h1, h2, h3)
- [ ] Meaningful link text
- [ ] Form labels and error identification
- [ ] No keyboard traps
- [ ] Page titles unique and descriptive

### Level AA (Target)
- [ ] Color contrast 4.5:1 (text), 3:1 (UI components)
- [ ] Resize text up to 200% without loss
- [ ] Multiple ways to find pages
- [ ] Focus visible on all interactive elements
- [ ] Error suggestions provided
- [ ] Labels or instructions for inputs
- [ ] Status messages announced to screen readers

## 9 New Success Criteria in WCAG 2.2

### 1. Focus Not Obscured (Minimum) - Level AA ⭐

**Requirement**: Focused element must be at least partially visible.

```typescript
// ✅ CORRECT - Focus visible
<Modal open={isOpen} onOpenChange={setIsOpen}>
  <ModalContent className="focus:outline-none focus-visible:ring-2">
    <input className="focus-visible:ring-2 focus-visible:ring-offset-2" />
  </ModalContent>
</Modal>

// ❌ WRONG - Modal covers focused element
<div className="fixed inset-0 z-50">
  <input />  {/* Focus hidden behind modal */}
</div>
```

### 2. Dragging Movements - Level AA ⭐

**Requirement**: Provide alternative to dragging (single-pointer operation).

```typescript
// ✅ CORRECT - Drag + alternative buttons
import { DndContext } from '@dnd-kit/core'

<div>
  <DraggableItem item={item} />
  {/* Alternative: Up/Down buttons */}
  <button onClick={() => moveUp(item.id)} aria-label="Move up">↑</button>
  <button onClick={() => moveDown(item.id)} aria-label="Move down">↓</button>
</div>

// ❌ WRONG - Drag only, no alternative
<DraggableItem item={item} />  {/* No keyboard/button alternative */}
```

### 3. Target Size (Minimum) - Level AA ⭐

**Requirement**: Interactive targets minimum 24×24 pixels.

```typescript
// ✅ CORRECT - 24×24 minimum
<button className="min-w-[24px] min-h-[24px] p-2">
  <Icon size={16} />
</button>

// ❌ WRONG - Too small
<button className="w-[16px] h-[16px]">
  <Icon size={16} />
</button>

// ✅ EXCEPTION - Spacing makes it effectively larger
<button className="p-4">  {/* Icon + padding = 24×24+ */}
  <Icon size={16} />
</button>
```

### 4. Consistent Help - Level A ⭐

**Requirement**: Help mechanism in same relative order across pages.

```typescript
// ✅ CORRECT - Consistent help button location
export default function Layout({ children }) {
  return (
    <div>
      <Header />
      {children}
      <Footer>
        <HelpButton />  {/* Always in footer, same position */}
      </Footer>
    </div>
  )
}
```

### 5. Redundant Entry - Level A ⭐

**Requirement**: Don't ask for same information twice.

```typescript
// ✅ CORRECT - Remember previous entries
const [formData, setFormData] = useState(() => {
  const saved = localStorage.getItem('formData')
  return saved ? JSON.parse(saved) : { name: '', email: '' }
})

// Auto-fill from previous step
<input
  value={formData.email}
  autoComplete="email"  // Help password managers
/>

// ❌ WRONG - Ask for email again
<input type="email" />  {/* Already asked in previous step */}
```

### 6. Accessible Authentication (Minimum) - Level AA ⭐

**Requirement**: No cognitive function test (puzzles, memory) for authentication.

```typescript
// ✅ CORRECT - Simple authentication
<input
  type="email"
  autoComplete="email"
  aria-label="Email address"
/>
<input
  type="password"
  autoComplete="current-password"
  aria-label="Password"
/>

// ✅ CORRECT - Support password managers
<button type="button" onClick={handlePasswordManagerFill}>
  Use Password Manager
</button>

// ❌ WRONG - Cognitive test required
<div>
  <p>What is 7 + 3?</p>  {/* Math test for login */}
  <input type="number" />
</div>
```

### 7-9. Focus Appearance (Level AAA)

Not required for Level AA compliance, but good practice.

## Keyboard Navigation

### All Interactive Elements

```typescript
// ✅ CORRECT - Keyboard accessible
<button onClick={handleClick} onKeyDown={handleKeyDown}>
  Click me
</button>

<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  Custom button
</div>

// ❌ WRONG - No keyboard support
<div onClick={handleClick}>Click me</div>
```

### Modal Dialogs

```typescript
import { Modal, ModalContent } from '@/components/ui/modal'

// ✅ CORRECT - Radix handles focus trap automatically
<Modal open={isOpen} onOpenChange={setIsOpen}>
  <ModalContent>
    <ModalHeader>
      <ModalTitle>Edit User</ModalTitle>
    </ModalHeader>
    <form>
      <input autoFocus />  {/* Focus first field */}
      <button type="submit">Save</button>
      <button type="button" onClick={() => setIsOpen(false)}>
        Cancel
      </button>
    </form>
  </ModalContent>
</Modal>

// Focus trap: Tab cycles within modal, Esc closes
```

### Skip Links

```typescript
// components/layout/Header.tsx
export default function Header() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
      >
        Skip to main content
      </a>
      <header>{/* Navigation */}</header>
    </>
  )
}

// app/(main)/layout.tsx
<main id="main-content">{children}</main>
```

## Screen Reader Support

### ARIA Labels

```typescript
// ✅ CORRECT - Descriptive labels
<button aria-label="Delete user John Doe">
  <TrashIcon />
</button>

<input
  type="search"
  aria-label="Search users"
  placeholder="Search..."
/>

// ❌ WRONG - Icon button without label
<button><TrashIcon /></button>
```

### ARIA Live Regions

```typescript
// ✅ CORRECT - Announce dynamic changes
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// For urgent messages
<div aria-live="assertive" aria-atomic="true">
  {errorMessage}
</div>

// Example: Search results announcement
const [searchResults, setSearchResults] = useState([])

<div>
  <input
    type="search"
    onChange={handleSearch}
    aria-label="Search items"
    aria-controls="search-results"
  />
  <div
    id="search-results"
    role="region"
    aria-live="polite"
    aria-label="Search results"
  >
    {searchResults.length} results found
  </div>
</div>
```

### Semantic HTML

```typescript
// ✅ CORRECT - Semantic structure
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/home">Home</a></li>
    <li><a href="/users">Users</a></li>
  </ul>
</nav>

<main>
  <h1>Page Title</h1>
  <section aria-labelledby="section-heading">
    <h2 id="section-heading">Section Title</h2>
  </section>
</main>

// ❌ WRONG - Div soup
<div className="nav">
  <div className="link">Home</div>
  <div className="link">Users</div>
</div>
```

## Color Contrast

### WCAG 2.2 Requirements

- **Normal text**: 4.5:1 contrast ratio
- **Large text** (18pt+): 3:1 contrast ratio
- **UI components**: 3:1 contrast ratio

### Check Contrast

```typescript
// ✅ CORRECT - High contrast
<div className="bg-[rgb(var(--bg-surface))] text-[rgb(var(--fg-default))]">
  {/* Project CSS variables already optimized for contrast */}
</div>

// Tool to check: Chrome DevTools → Elements → Contrast ratio
```

### Don't Rely on Color Alone

```typescript
// ❌ WRONG - Color only
<span className="text-red-500">Error</span>
<span className="text-green-500">Success</span>

// ✅ CORRECT - Color + icon + text
<span className="text-red-500">
  <AlertIcon aria-hidden="true" />
  Error: Invalid input
</span>

<span className="text-green-500">
  <CheckIcon aria-hidden="true" />
  Success: Saved
</span>
```

## Form Accessibility

### Labels and Error Messages

```typescript
import { useLanguage } from '@/contexts/LanguageContext'

function UserForm() {
  const { t } = useLanguage()
  const [errors, setErrors] = useState<Record<string, string>>({})

  return (
    <form>
      {/* ✅ CORRECT - Label + error announcement */}
      <div>
        <label htmlFor="username">{t('Username')}</label>
        <input
          id="username"
          type="text"
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'username-error' : undefined}
        />
        {errors.username && (
          <span id="username-error" role="alert" className="text-red-500">
            {errors.username}
          </span>
        )}
      </div>

      {/* ❌ WRONG - No label */}
      <input type="text" placeholder="Username" />
    </form>
  )
}
```

### Required Fields

```typescript
// ✅ CORRECT - Indicate required fields
<label htmlFor="email">
  {t('Email')} <span aria-label="required">*</span>
</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
/>

// Or use fieldset
<fieldset>
  <legend>{t('Contact Information')} <span aria-label="required fields">*</span></legend>
  {/* Fields */}
</fieldset>
```

## DataGrid Accessibility

```typescript
import { DataGrid } from '@/components/datagrid'

// ✅ DataGrid already implements:
// - Keyboard navigation (arrows, Tab, Enter)
// - ARIA roles (grid, row, columnheader, gridcell)
// - Screen reader announcements
// - Focus management

<DataGrid
  data={users}
  columns={columns}
  ariaLabel="User list"  // Descriptive label
  getRowId={(row) => row.id}
/>
```

## Testing Accessibility

### 1. Keyboard Testing
- Tab through all interactive elements
- Enter/Space activates buttons
- Escape closes modals
- Arrows navigate grids
- No keyboard traps

### 2. Screen Reader Testing
- **Windows**: NVDA (free) or JAWS
- **Mac**: VoiceOver (built-in, Cmd+F5)
- **Linux**: Orca

### 3. Automated Testing

```bash
# Install axe DevTools (Chrome extension)
# Or run automated tests
npm install --save-dev @axe-core/react

# In development
import { useEffect } from 'react'

if (process.env.NODE_ENV !== 'production') {
  const axe = require('@axe-core/react')
  axe(React, ReactDOM, 1000)
}
```

### 4. Browser DevTools
- Chrome DevTools → Lighthouse → Accessibility audit
- Firefox DevTools → Accessibility tab
- Edge DevTools → Issues → Accessibility

## Common Issues

### Issue 1: Missing Alt Text
```typescript
// ❌ WRONG
<img src="/logo.png" />

// ✅ CORRECT
<Image src="/logo.png" alt="Company logo" width={200} height={50} />

// Decorative images
<Image src="/decoration.png" alt="" width={100} height={100} />
```

### Issue 2: Poor Focus Indicators
```typescript
// ✅ CORRECT - Visible focus
<button className="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
  Click me
</button>

// Global CSS (already in project)
// :focus-visible { outline: 2px solid var(--color-primary); }
```

### Issue 3: Non-Descriptive Links
```typescript
// ❌ WRONG
<a href="/details">Click here</a>

// ✅ CORRECT
<a href="/details">View user details</a>

// Or with aria-label
<a href="/details" aria-label="View details for user John Doe">
  View details
</a>
```

## Quick Wins

1. **Add Alt Text**: All images need descriptive alt text
2. **Keyboard Focus**: Ensure all interactive elements focusable
3. **ARIA Labels**: Icon buttons need aria-label
4. **Color Contrast**: Use project CSS variables (already optimized)
5. **Form Labels**: Every input needs a label
6. **Heading Structure**: Logical h1 → h2 → h3 hierarchy

## WCAG 2.2 Compliance Checklist

**Level A (25 criteria):**
- [ ] 1.1.1 Non-text Content
- [ ] 1.2.1 Audio-only and Video-only
- [ ] 1.2.2 Captions (Prerecorded)
- [ ] 1.2.3 Audio Description or Media Alternative
- [ ] 1.3.1 Info and Relationships
- [ ] 1.3.2 Meaningful Sequence
- [ ] 1.3.3 Sensory Characteristics
- [ ] 1.4.1 Use of Color
- [ ] 1.4.2 Audio Control
- [ ] 2.1.1 Keyboard
- [ ] 2.1.2 No Keyboard Trap
- [ ] 2.1.4 Character Key Shortcuts
- [ ] 2.2.1 Timing Adjustable
- [ ] 2.2.2 Pause, Stop, Hide
- [ ] 2.3.1 Three Flashes or Below
- [ ] 2.4.1 Bypass Blocks
- [ ] 2.4.2 Page Titled
- [ ] 2.4.3 Focus Order
- [ ] 2.4.4 Link Purpose (In Context)
- [ ] 2.5.1 Pointer Gestures
- [ ] 2.5.2 Pointer Cancellation
- [ ] 2.5.3 Label in Name
- [ ] 2.5.4 Motion Actuation
- [ ] 3.2.1 On Focus
- [ ] 3.2.2 On Input

**Level AA (13 additional criteria):**
- [ ] 1.2.4 Captions (Live)
- [ ] 1.2.5 Audio Description
- [ ] 1.3.4 Orientation
- [ ] 1.3.5 Identify Input Purpose
- [ ] 1.4.3 Contrast (Minimum) - 4.5:1
- [ ] 1.4.4 Resize Text
- [ ] 1.4.5 Images of Text
- [ ] 1.4.10 Reflow
- [ ] 1.4.11 Non-text Contrast
- [ ] 1.4.12 Text Spacing
- [ ] 1.4.13 Content on Hover or Focus
- [ ] 2.4.5 Multiple Ways
- [ ] 2.4.6 Headings and Labels
- [ ] 2.4.7 Focus Visible
- [ ] 3.1.2 Language of Parts
- [ ] 3.2.3 Consistent Navigation
- [ ] 3.2.4 Consistent Identification
- [ ] 3.3.3 Error Suggestion
- [ ] 3.3.4 Error Prevention

## When to Use This Skill

Use when user mentions:
- "Accessibility" or "a11y"
- "WCAG compliance"
- "Screen reader support"
- "Keyboard navigation"
- "Focus management"
- Legal/compliance requirements
- Preparing for accessibility audit
