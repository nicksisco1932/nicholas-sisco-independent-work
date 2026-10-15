# Review an editorial candidate on a phone

The code-only implementation does not provide a live preview service. Preview uploads and production promotion remain disabled until the owner separately approves setup and a reviewed activation change. No actual-phone acceptance, Access test, or production publication is established by this guide.

Use a phone browser for the pilot. Record the phone model, operating system, browser/version, UTC time, candidate ID, and evidence location. Do not assume every protected-environment approval screen is available in the native GitHub app.

## Read and request a revision

1. Open the PR's current candidate receipt. Check the full source SHA, candidate ID, immutable preview URL, build result, and superseded/stale status. A moving PR alias is only a convenience; the immutable URL identifies the reviewed version.
2. Open the immutable HTTPS link in a private tab over cellular. Confirm Access requires login and an unapproved identity cannot retrieve the article or its assets. Approved setup must also test default, alias, version, historical, deep-page, CSS, JavaScript, image, sitemap, and any future custom-domain paths outside an authenticated browser/cache.
3. Sign in with the approved identity. Read the title, middle, and ending; check navigation, touch targets, and layout. Ordinary internal navigation must stay on the review hostname. Production canonicals/sitemap are expected to use the permanent origin because those asset bytes will be promoted unchanged.
4. Open the linked PR. Leave a precise request using the template below. Do not include confidential text or personal information in this public repository's comments.
5. Wait for the named executor's acknowledgement and branch push. A comment alone does not start an agent or rebuild the site.
6. Wait for a new successful candidate receipt and immutable URL. Verify the requested sentence and new SHA/digest. Reopening the old URL must still identify the old candidate. If the build fails, the prior preview remains stale; it is not evidence that the revision is ready.
7. Repeat as needed. GitHub's browser file editor is an optional path for simple edits committed to the PR branch. Normal editorial work does not edit main directly.

```text
Revision request
Candidate ID / full source SHA:
Page / section / current sentence:
Requested replacement or instruction:
Expected result:
```

`published: true` makes a collection entry buildable under the existing gate; it does not grant merge or release authority. Do not enable all unpublished content for preview. Directly authored pages and public assets need explicit review too.

## Accept text, then review the final candidate

Accepting manuscript text, authorizing a merge, approving a release, and verifying publication are separate steps. After a separately authorized merge, main produces its own final candidate. Review that current-main candidate's immutable preview even if a PR preview already looked correct.

Use the [release summary](release-summary.md) to compare the full current-main SHA/tree, exact run/attempt/artifact IDs, archive/file digests, final production origin, destination account/Worker identity, and evidence. A fixture-origin bundle is not releasable. Changing the origin, source, candidate bytes, trusted configuration, target, or attempt requires a new candidate and gate.

Record the browser/phone result in a Director-authored PR/issue comment in this repository containing literal `BROWSER ACCEPTED`, the exact candidate ID, archive SHA-256, preview version UUID, and evidence links. The release request identifies this comment with `browser_evidence_comment_id`; trusted preparation freezes its snapshot and publication rechecks it unchanged. Editing/deleting the comment invalidates that snapshot. The comment records the human check and cannot replace protected-environment approval.

```text
BROWSER ACCEPTED
Candidate ID: <exact candidate ID>
Archive SHA-256: <exact 64-character digest>
Preview version UUID: <exact review version UUID>
Phone/browser/version, UTC time, checks and evidence links:
```

On the phone browser, open the pending protected production job and review its frozen summary. The pre-created environment must require the Director as its only reviewer, disable administrator bypass, restrict releases to main, and allow Director self-initiation by leaving “Prevent self-review” off. Approve only the exact candidate and destination displayed there. Chat, a typed `DEPLOY`, generic PR approval, and editable comments cannot replace that authenticated environment decision.

## Pilot before a real release

Use one short public-safe article or an explicitly approved revision. Never publish a disposable marker on the real website without authorization.

| Check | Required observation |
| --- | --- |
| Private preview | Private-tab login required; wrong identity denied; approved identity succeeds; session expiry/revocation verified. |
| Revision A → B | Executor acknowledges, branch push creates B, B has a new digest/version, and A remains immutable. Delayed A cannot replace B's current receipt. |
| Failure | Failed B is reported as failed; A remains explicitly stale rather than being relabeled B. |
| Approval freshness | A tiny change after a release request forces a fresh candidate/gate. Approval for A cannot publish B. |
| Preview availability | Deleted, swapped, or disabled preview versions block release even if Access still returns a login redirect. |
| Final main review | The inspected candidate equals current main and has permanent-origin bytes. |
| Harmless-target rehearsal | Rejection, no approval, wrong reviewer, stale SHA, changed target/digest, rerun attempt, and expired artifact all fail closed before any production use. |
| Actual browser behavior | HTTPS, redirects/status/query/fragment behavior, real 404, canonical/sitemap/robots, keyboard/focus, 320/390/768/1280 CSS widths, and course controls have recorded results. |

Passing these checks establishes the preview/revision/gating pilot. It does not authorize production. Record a failure at its precise stage; do not weaken Access or retry the denied localhost path to manufacture browser evidence.

## After a separately approved publication

Open the live article on the actual phone. Confirm the final sentence, navigation, layout, and relevant public routes, then reconcile the actual production version and independently fetched uncompressed response-body hashes with the approved bundle. A green workflow alone is not live acceptance.

Record the verified URL, full SHA, candidate/digest/artifact identity, actual production version, authenticated approval identity/time, UTC verification time, device/browser, results, and evidence links in the existing publication record. Keep Notion publication history and FIR-34 as concise receipts; neither is a competing manuscript store or deploy trigger.

If a deployment times out or is canceled, inspect actual platform state before recovery. Do not assume it published nothing. Rollback needs separate approval naming the exact previously accepted artifact/version and destination; a first launch may have none.
