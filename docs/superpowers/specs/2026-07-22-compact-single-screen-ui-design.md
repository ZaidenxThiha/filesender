# Compact Single-Screen UI Design

## Goal

Make the browser file-transfer workspace feel immediate and compact. On a normal laptop viewport, users should see the complete primary interface without scrolling. Small screens should show one focused action at a time.

## Layout

- Remove the site header, site footer, and the “How it works” section.
- Keep all transfer functionality inside one centered workspace bounded by the viewport.
- Replace the large marketing hero with a compact introduction containing the product name, a short purpose statement, and the two existing trust indicators.
- Keep Send and Receive cards side-by-side at desktop widths.
- At mobile widths, show a two-option Send/Receive switcher and display only the selected card. Switching views must not reset selected files, generated codes, connection state, or transfer progress.

## Sizing and Scrolling

- The idle interface must fit without document scrolling at 1280 × 720 and larger desktop viewports.
- Use compact spacing, typography, controls, and card padding while retaining comfortable click and touch targets.
- Allow internal file-list scrolling when many files are selected instead of expanding the page indefinitely.
- Small mobile screens may scroll within the document when transfer details or browser chrome reduce available height, but only one transfer card is visible at a time.

## Visual Treatment

- Preserve the existing paper, ink, mint, and white palette.
- Keep the dark Send card and light Receive card distinction.
- Preserve visible keyboard focus, status messages, errors, progress, and success states.
- Remove unused styling associated with the deleted header, footer, manifest review, and explanatory section.

## Interaction and Accessibility

- The mobile Send/Receive switcher uses real buttons with pressed-state semantics.
- Desktop displays both cards and does not require the switcher.
- Existing labels, file picker behavior, receive-code validation, automatic acceptance, automatic sending, download behavior, reset actions, and keyboard navigation remain unchanged.
- Responsive hiding must be CSS-driven so mounted transfer sessions continue running when the user switches panels.

## Verification

- Add an interaction test confirming the mobile panel switcher changes the selected panel without removing the inactive panel from application state.
- Keep all existing unit, integration, and byte-for-byte browser transfer tests passing.
- Verify lint and the production build.
- Use browser viewport checks at 1280 × 720 and a representative phone size to confirm desktop has no document scroll and mobile shows one panel at a time.
- Deploy to `https://sendany.vercel.app` and rerun the production browser-transfer tests.
