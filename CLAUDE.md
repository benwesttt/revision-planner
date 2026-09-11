# Working agreements for this project

## Verification
- After any file edit, run `npm run build` and `npx eslint <file>` and
  report pass/fail — don't rely on eyeballing a diff preview to judge
  correctness.
- Terminal confirmation previews are unreliable on long files or on edits
  with a lot of surrounding unchanged code — they can appear to drop or
  duplicate content that is actually fine on disk. Treat a garbled-looking
  preview as inconclusive, not as evidence of a bug; verify with `cat` or
  a build/lint run instead of re-pasting full files.

## Review checkpoints
- Self-approve read-only commands (git status/log/diff/pull, npm run
  build, npx eslint, mkdir within the project) without asking.
- Always ask before: git commit, git push, database migrations, anything
  destructive (rm, force push).

## Working style
- Explain design decisions as you go — the why, not just the what. Quote
  the specific lines of code you're referring to.
- If something in a plan or prompt looks underspecified or you're making
  an assumption (like a numeric threshold), say so explicitly rather than
  picking silently.

## Design Tokens (Revisr rebrand)

Tokens live in frontend/src/index.css under @theme. Never use default
Tailwind gray/indigo/red/green/amber/yellow classes in this codebase —
always use these:

| Token           | Hex / value                      | Use |
|-----------------|-----------------------------------|-----|
| background      | #1F3427                          | page bg |
| surface         | #2A4232                          | cards, panels |
| border          | #3A5744                          | dividers; also used as bg for a "lighter than surface" nested panel or badge/pill sitting on a surface card |
| accent          | #D4A017                          | primary actions, highlights, active states |
| accent-hover    | #DFAF3D                           | hover state for accent (lighter, not darker) |
| ink             | #F5F3EC                          | primary text |
| ink-secondary   | rgba(245,243,236,0.65)           | supporting text |
| ink-muted       | rgba(245,243,236,0.4)            | hints, placeholders, least prominent text |
| danger / danger-bg     | #E0575A / rgba(224,87,90,0.14)   | errors |
| success / success-bg   | #4FBE85 / rgba(79,190,133,0.14)  | success states |
| warning / warning-bg   | #E8933A / rgba(232,147,58,0.14)  | warnings |
| font-headline   | Fraunces                          | page/section titles, wordmark only |
| font-body       | Plus Jakarta Sans                 | everything else (already the body default) |

Rules:
- Buttons: bg-accent hover:bg-accent-hover text-background
- Active/selected nav or list items: bg-accent text-background
- Pills/badges sitting on a card: bg-border text-ink-secondary (one step lighter than the surface card they sit on)
- A translucent status banner (background tint + border) uses the *-bg
  token plus border-{color}/40; a plain solid border/text status (e.g.
  conditional card borders) uses no opacity suffix
- Subtle hover highlight where no dedicated hover token exists:
  hover:bg-white/5
- Any inline style={{}} color value must use the raw hex above, not a
  class name — check for hardcoded old-palette hex (e.g. #6366f1,
  #ef4444) hiding in fallback values or style objects, not just
  Tailwind classes
- Star ratings / rating icons: filled = text-accent, unfilled =
  text-ink-muted (text-ink-secondary on hover if interactive)

## Additional patterns (resolved during page migration)

- Recessed/inset elements (form inputs, nested rows inside a surface
  card): bg-background, keep border-border if the original had a border
- Input focus ring: focus:border-accent
- Native checkbox/radio tint: accent-accent
- Toggle/segmented control: active = bg-accent border-accent
  text-background; inactive = bg-surface border-border text-ink-secondary
  hover:text-ink
- Solid neutral secondary button (not a pill, not a link):
  bg-border hover:bg-white/5 text-ink-secondary
- Solid destructive button: bg-danger hover:bg-danger/90 text-ink
  (light text — danger is dark/saturated enough to need it, unlike accent)
- App-level default/placeholder hex values (e.g. a new item's starting
  color before the user picks one) should use #D4A017, not old indigo hex.
  This does NOT apply to genuine user-authored color data (e.g. the
  selectable course-color swatch palette) — leave that untouched.
- Multi-step progress indicator: current step = bg-accent, completed
  steps = bg-success, future steps = bg-border
- Informational (non error/warning/success) tinted banner:
  bg-accent/10 border-accent/30 text-accent
- Accent-colored inline text/links on hover: text-accent hover:text-accent-hover
