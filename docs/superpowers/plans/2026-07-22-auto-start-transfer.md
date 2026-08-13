# Automatic Transfer Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a valid receive-code submission automatically authorize and start the file transfer.

**Architecture:** Keep the existing `hello → manifest → accept` protocol, but emit `accept` automatically after manifest validation. The sender responds to `accept` by calling the existing chunked `sendFiles` engine immediately; only the manual UI controls are removed.

**Tech Stack:** React 19.2, TypeScript, PeerJS, Vitest, Testing Library, Playwright.

## Global Constraints

- Entering a valid receive code is the receiver's explicit consent.
- The manifest must still be parsed before file bytes transfer.
- Existing progress, cancellation, completion, and download behavior must remain unchanged.
- No **Accept files** or **Start sending** control may render.

---

### Task 1: Automatic application handshake

**Files:**
- Modify: `web/src/components/transfer-workspace.integration.test.tsx`
- Modify: `web/src/components/transfer-workspace.tsx`
- Modify: `web/e2e/transfer.spec.ts`

**Interfaces:**
- Consumes: existing `PeerSession.send`, `ManifestMessage`, and `sendFiles` interfaces.
- Produces: automatic receiver acknowledgement and sender transfer start.

- [ ] **Step 1: Write the failing integration test**

Capture the receiver session handlers, submit a valid code, invoke `onConnection`, then invoke `onData` with a valid manifest. Assert the session sends `{ protocolVersion: 1, type: "accept" }` without a user click and assert no **Accept files** button appears.

- [ ] **Step 2: Run the focused test and verify red**

Run: `cd web && npm test -- transfer-workspace.integration.test.tsx`

Expected: FAIL because the current UI renders **Accept files** and does not send `accept` until it is clicked.

- [ ] **Step 3: Implement automatic acknowledgement and start**

Move the existing sender `startSending` callback before `handleSenderData` so `accept` can invoke it directly. When the receiver parses `manifest`, register it with `FileReceiver`, send `accept`, and enter `receiving`. Remove the review state, manifest review controls, and sender start button. Render **Connected. Your download will start automatically.** until progress arrives.

- [ ] **Step 4: Update the browser flow**

Remove clicks on **Accept files** and **Start sending** from `web/e2e/transfer.spec.ts`. After entering the code, wait directly for the download event and verify byte equality plus both completion headings.

- [ ] **Step 5: Verify and commit**

Run:

```bash
cd web
npm test
npm run lint
npm run build
npm run test:e2e
```

Expected: 16 or more unit/integration tests and both browser tests pass.

```bash
git add web
git commit -m "feat(web): start transfers automatically"
```
