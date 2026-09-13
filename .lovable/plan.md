# Liquid Glass Dark upgrade

## What will change
- Establish a coherent dark liquid-glass system with deep charcoal surfaces, restrained aurora lighting, layered borders, highlights, shadows, and reduced-motion support.
- Recompose the public page around a floating navigation bar, brand-first hero, a tangible StudentHub workspace preview, the existing six features, and the existing final call to action.
- Apply the same visual language to sign-in, the signed-in navigation, page headings, buttons, inputs, tabs, panels, and empty states.
- Keep every route, label, action, form, authentication flow, and data operation intact.

## Quality checks
- Verify public, sign-in, and signed-in screens at desktop and mobile sizes.
- Confirm all routes still resolve, controls remain readable and keyboard accessible, and reduced-motion/mobile effects are restrained.
- Check the live build, browser console, and representative interactions for errors.

## Technical details
- Centralize visual values and reusable glass/aurora utilities in the global design tokens.
- Use shared components for ambient backgrounds and interface controls instead of one-off visual effects.
- Preserve the existing React/TanStack and Lovable Cloud logic; this is a presentation-only upgrade.
