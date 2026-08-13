# Compact Single-Screen UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tall marketing page with a compact responsive transfer workspace that fits a normal laptop viewport and focuses mobile users on one action at a time.

**Architecture:** Keep the existing transfer state and WebRTC data flow inside `TransferWorkspace`. Add only a presentation-level mobile panel selection state, simplify the page shell, and use responsive CSS to display both mounted cards on desktop or one mounted card on mobile.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS, Vitest/Testing Library, Playwright, Vercel

## Global Constraints

- Remove the site header, site footer, and “How it works” section.
- The idle interface must fit without document scrolling at 1280 × 720 and larger desktop viewports.
- Mobile must show only the selected Send or Receive card without unmounting transfer state.
- Preserve existing transfer, validation, accessibility, progress, error, and reset behavior.
- Preserve the paper, ink, mint, white, dark-Send-card, and light-Receive-card visual system.

---

### Task 1: Mobile panel selection

**Files:**
- Modify: `web/src/components/transfer-workspace.integration.test.tsx`
- Modify: `web/src/components/transfer-workspace.tsx`

**Interfaces:**
- Produces: local `activePanel: "send" | "receive"` presentation state and `.workspace-switcher` buttons with `aria-pressed`.
- Preserves: mounted Send and Receive card DOM and all existing transfer refs/state.

- [ ] **Step 1: Write the failing interaction test**

Add a test that renders `TransferWorkspace`, finds `button` elements named `Send files` and `Receive files`, verifies Send begins pressed, clicks Receive, and verifies the pressed states swap while both `.send-card` and `.receive-card` remain in the document.

```tsx
it("switches the focused mobile panel without unmounting either transfer card", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <TransferWorkspace sessionFactories={{ sender: vi.fn(), receiver: vi.fn() }} />,
  );
  const send = screen.getByRole("button", { name: "Send files" });
  const receive = screen.getByRole("button", { name: "Receive files" });

  expect(send).toHaveAttribute("aria-pressed", "true");
  expect(receive).toHaveAttribute("aria-pressed", "false");
  await user.click(receive);
  expect(send).toHaveAttribute("aria-pressed", "false");
  expect(receive).toHaveAttribute("aria-pressed", "true");
  expect(container.querySelector(".send-card")).toBeInTheDocument();
  expect(container.querySelector(".receive-card")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `cd web && npm test -- --run src/components/transfer-workspace.integration.test.tsx`

Expected: FAIL because the Send/Receive switcher does not exist.

- [ ] **Step 3: Implement the minimal panel switcher**

Add `const [activePanel, setActivePanel] = useState<"send" | "receive">("send")`, render a two-button `.workspace-switcher` before `.action-grid`, and add `is-mobile-active` to the selected card. Use `type="button"` and `aria-pressed={activePanel === "send"}` / `aria-pressed={activePanel === "receive"}`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `cd web && npm test -- --run src/components/transfer-workspace.integration.test.tsx`

Expected: all interaction tests pass.

### Task 2: Compact page structure and styles

**Files:**
- Modify: `web/src/app/page.tsx`
- Modify: `web/src/components/transfer-workspace.tsx`
- Modify: `web/src/app/globals.css`

**Interfaces:**
- Consumes: `.workspace-switcher` and `.is-mobile-active` from Task 1.
- Produces: a headerless/footerless page shell and responsive single-viewport layout.

- [ ] **Step 1: Simplify the page shell**

Remove the `BrandMark` import, `<header>`, and `<footer>` from `page.tsx`, leaving only:

```tsx
export default function Home() {
  return (
    <main className="page-shell">
      <TransferWorkspace />
    </main>
  );
}
```

- [ ] **Step 2: Compact the workspace markup**

Replace the large introductory copy with a compact brand/title block and keep the trust row beside it. Remove `.how-it-works` entirely. Use the product name `sendany`, heading `Send files, simply.`, and copy `Choose files or enter a receive code. Your transfer starts automatically.`

- [ ] **Step 3: Replace tall-page CSS with viewport-oriented CSS**

Set `.page-shell` to center a `min(1100px, 100%)` workspace with compact viewport padding. Make `.workspace` a compact grid, reduce intro and card typography, set desktop card height to a bounded `clamp()` value, and reduce picker/input/card padding. Delete `.site-header`, `.site-footer`, `.brand`, `.header-note`, `.how-it-works`, and obsolete manifest-review rules.

At `max-width: 760px`, display `.workspace-switcher`, hide `.transfer-card` by default, show `.transfer-card.is-mobile-active`, and use one grid column. Above that breakpoint, hide the switcher and display both cards.

- [ ] **Step 4: Run unit checks**

Run: `cd web && npm test && npm run lint && npm run build`

Expected: 8 test files (including the new interaction case) pass, ESLint exits 0, and Next.js production build exits 0.

### Task 3: Browser viewport and transfer verification

**Files:**
- Modify: `web/e2e/transfer.spec.ts`

**Interfaces:**
- Verifies: responsive CSS and existing browser-to-browser behavior.

- [ ] **Step 1: Add desktop and mobile layout checks**

Add a Playwright test that opens a page at 1280 × 720, asserts `scrollHeight <= innerHeight`, and confirms both cards are visible. Then resize to 390 × 844, assert the Send card is visible and Receive card hidden, click `Receive files`, and assert visibility swaps.

```ts
test("keeps the workspace compact and focuses one mobile panel", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  await expect(page.locator(".send-card")).toBeVisible();
  await expect(page.locator(".receive-card")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".send-card")).toBeVisible();
  await expect(page.locator(".receive-card")).toBeHidden();
  await page.getByRole("button", { name: "Receive files" }).click();
  await expect(page.locator(".send-card")).toBeHidden();
  await expect(page.locator(".receive-card")).toBeVisible();
});
```

- [ ] **Step 2: Run browser tests and adjust CSS until GREEN**

Run: `cd web && npm run test:e2e`

Expected: validation, byte-for-byte transfer, and compact responsive-layout tests all pass.

- [ ] **Step 3: Run the complete local quality gate**

Run separately from `web/`: `npm test`, `npm run lint`, `npm run build`, `npm audit --omit=dev`, and `npm run test:e2e`.

Expected: all commands exit 0 and audit reports 0 vulnerabilities.

- [ ] **Step 4: Commit the implementation**

```bash
git add web/src/app/page.tsx web/src/app/globals.css web/src/components/transfer-workspace.tsx web/src/components/transfer-workspace.integration.test.tsx web/e2e/transfer.spec.ts
git commit -m "feat(web): compact transfer workspace"
```

### Task 4: Production deployment

**Files:**
- No tracked file changes expected.

**Interfaces:**
- Consumes: verified Next.js production build.
- Produces: updated production deployment at `https://sendany.vercel.app`.

- [ ] **Step 1: Deploy the verified build**

Run: `cd web && npx vercel deploy --prod --yes`

Expected: Vercel reports `READY` and aliases the deployment to `https://sendany.vercel.app`.

- [ ] **Step 2: Verify the live responsive transfer flow**

Run: `cd web && PLAYWRIGHT_BASE_URL=https://sendany.vercel.app npm run test:e2e`

Expected: all Playwright tests pass against production.

- [ ] **Step 3: Confirm repository state**

Run: `git status --short && git log -1 --oneline`

Expected: clean status and latest commit `feat(web): compact transfer workspace`.
