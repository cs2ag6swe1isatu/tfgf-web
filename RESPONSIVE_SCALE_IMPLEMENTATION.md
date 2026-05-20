# Responsive Scale Hook Implementation

## Summary
Implemented a centralized responsive scale hook (`useResponsiveScale`) to standardize WVGA (800×480) and compact viewport handling across the multiplayer UI.

## Completed Changes

### 1. Created Hook: `src/hooks/useResponsiveScale.tsx`
A new React hook that:
- Calculates scale factor based on target resolution (800×600) vs. actual window size
- Provides responsive tokens with breakpoints for:
  - `isCompact`: true when width ≤ 820 or height ≤ 500 (WVGA threshold)
  - `isMobile`: true when width < 600
  - `scale`: 0-1 scale factor (clamped to [0.5, 1.5])
  - Individual token values for padding, gap, font sizes, avatar sizes (computed from scale)
- Uses `useEffect` to listen to window resize events for dynamic responsiveness
- Cleanup function removes listener on unmount

**Token categories:**
- Spacing: `padding`, `gap`, `gapSmall`, `marginSmall`, `marginMedium`
- Typography: `fontSizeSmall`, `fontSizeBase`, `fontSizeLarge`
- Sizing: `avatarSmall`, `avatarMedium`, `iconSize`

### 2. Refactored: `src/pages/SpectatorView.tsx`
- Added import: `useResponsiveScale`
- Replaced hardcoded viewport check:
  ```typescript
  // Before:
  const isCompactViewport = window.innerWidth <= 820 || window.innerHeight <= 500;
  
  // After:
  const tokens = useResponsiveScale();
  const isCompactViewport = tokens.isCompact;
  ```
- All existing ternary expressions (20+ uses) remain unchanged; they now reference the hook-provided value
- Future enhancement: replace individual ternaries with direct token lookups (e.g., `padding: tokens.padding`)

### 3. Refactored: `src/pages/MultiplayerLobbyPage.tsx`
- Added import: `useResponsiveScale`
- Replaced hardcoded viewport check (same pattern as SpectatorView)
- Maintains backward compatibility with all existing ternary expressions (20+ uses)

## Key Benefits

1. **Single Source of Truth**: All responsive logic now comes from one hook
2. **Consistent Breakpoints**: WVGA threshold (820×500) defined in one place
3. **Centralized Tokens**: Future refactoring can swap ternaries for token values without changing page logic
4. **Reactive**: Automatically recalculates on window resize
5. **Testable**: Pure hook logic can be unit tested independently
6. **Extensible**: Easy to add new breakpoints, tokens, or scale calculations

## Migration Path for Existing Ternaries

Current approach (minimal disruption):
```typescript
const tokens = useResponsiveScale();
const isCompactViewport = tokens.isCompact;
padding: isCompactViewport ? "12px 10px" : "24px 16px",  // ← still ternary
```

Future approach (token-driven):
```typescript
const tokens = useResponsiveScale();
padding: tokens.padding,  // ← direct token value
```

To convert, replace ternaries with token values:
- `? "12px 10px" : "24px 16px"` → `tokens.padding`
- `? "10px" : "16px"` → `tokens.gap`
- `? "9px" : "11px"` → `tokens.fontSizeSmall`

## Testing

- ✅ No TypeScript errors in SpectatorView.tsx
- ✅ No TypeScript errors in MultiplayerLobbyPage.tsx
- ✅ No TypeScript errors in useResponsiveScale.tsx

Manual testing recommendations:
1. Set resolution to WVGA (800×480) in store
2. Open SpectatorView and MultiplayerLobbyPage
3. Verify layout remains compact and readable
4. Resize window and confirm responsive adjustments occur

## Next Steps

1. **Future Phase**: Replace individual ternaries with token-driven values (low priority, can batch with other UI refactors)
2. **Other Components**: Apply hook to other pages that need responsive WVGA support (e.g., MultiplayerMenuPage, QuestionPage)
3. **Theme Integration**: Consider adding responsive token defaults to MUI theme configuration
4. **Documentation**: Update component guidelines to prefer `useResponsiveScale` over hardcoded breakpoints

## Files Modified

- ✅ Created: `src/hooks/useResponsiveScale.tsx` (new hook)
- ✅ Updated: `src/pages/SpectatorView.tsx` (import + hook usage)
- ✅ Updated: `src/pages/MultiplayerLobbyPage.tsx` (import + hook usage)

## Related Issues

- Addresses WVGA layout concerns for multiplayer UI
- Centralizes responsive logic for future expansion
- Prepares foundation for token-driven responsive design
