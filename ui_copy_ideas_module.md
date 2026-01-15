# Ideas / Planning Module - UI Copy

**Status:** PRE-GOVERNANCE  
**Purpose:** Discussion and planning space only. No legal or procedural power.

---

## Global Banner Text

### Main Banner
```
Ideas / Planning
Discussion and planning space. Ideas have no legal or procedural power.
```

### Info Banner (when applicable)
```
This module is for discussion and planning only. Ideas do not create decisions, approvals, or binding outcomes.
```

---

## Phase Labels

### Phase: draft
**Label:** `Draft`  
**Explanation:** Initial idea or plan. Not yet shared for discussion.

### Phase: discussion
**Label:** `Discussion`  
**Explanation:** Idea is open for comments and feedback. No procedural meaning.

### Phase: refined
**Label:** `Refined`  
**Explanation:** Idea has been revised based on discussion. Label only, no status change.

### Phase: ready_for_vote
**Label:** `Ready for Resolution Draft`  
**Explanation:** Idea may be converted to a draft resolution. Conversion requires explicit human action in Governance module. This label does not imply approval or adoption.

### Phase: abandoned
**Label:** `Abandoned`  
**Explanation:** Idea is no longer being developed. No procedural meaning.

---

## Tooltips for Runtime Signals

### Objection Indicator
```
This comment is marked as an objection. Objections are semantic markers only and have no procedural power.
```

### Snapshot Indicator
```
This is a snapshot of an idea state. Snapshots are read-only and cannot be modified.
```

### Comment Count
```
Number of comments on this idea. Comments are discussion only and have no voting or decision-making semantics.
```

### Phase Change Restriction
```
Phase changes must be made through the system interface. Direct phase edits are not permitted.
```

### Metadata Validation Error
```
Metadata keys must be namespaced (fact.*, project.*, ui.*, ai.*). AI keys are limited to: ai.summary, ai.risks, ai.suggestions.
```

---

## Button Labels and Confirmations

### Create Idea
**Button:** `Create Idea`  
**Confirmation:** None (no destructive action)

### Add Comment
**Button:** `Add Comment`  
**Confirmation:** None (no destructive action)

### Mark as Objection
**Checkbox label:** `Mark as objection`  
**Tooltip:** `Objections are semantic markers only. You must provide a reason in metadata.`

### Change Phase
**Button:** `Change Phase`  
**Confirmation:** `Change phase from [current] to [new]? This is a label change only and has no procedural meaning.`

### Promote to Resolution Draft
**Button:** `Create Draft Resolution`  
**Confirmation:** `Create a draft resolution from this idea? The resolution will be created in DRAFT status only. No approval or adoption occurs. This action requires explicit confirmation in the Governance module.`

**Warning text (before confirmation):**
```
This action will create a DRAFT resolution only. The resolution has no legal or procedural power until it goes through the Governance process.
```

### Abandon Idea
**Button:** `Mark as Abandoned`  
**Confirmation:** `Mark this idea as abandoned? This is a label change only and has no procedural meaning.`

---

## AI Disclaimer Texts

### AI Summary Section
**Header:** `AI-Generated Summary`  
**Disclaimer:** `This summary is AI-generated interpretation only. It has no legal or procedural power. Review carefully before any action.`

### AI Risks Section
**Header:** `AI-Generated Risk Assessment`  
**Disclaimer:** `This risk assessment is AI-generated interpretation only. It is advisory and has no legal or procedural power.`

### AI Suggestions Section
**Header:** `AI-Generated Suggestions`  
**Disclaimer:** `These suggestions are AI-generated interpretation only. They are advisory and have no legal or procedural power.`

### General AI Disclaimer (footer)
```
All AI outputs in this module are interpretative only. AI data has no legal or procedural power. All decisions require explicit human action in the Governance module.
```

---

## Error Messages

### Snapshot Immutability
```
Cannot modify snapshot ideas. Snapshots are read-only and preserve historical state.
```

### Phase Validation
```
Invalid phase value. Allowed values: draft, discussion, refined, ready_for_vote, abandoned.
```

### Objection Validation
```
Objections must include a non-empty reason in metadata (fact.objection.reason).
```

### Membership Validation
```
You must be an ACTIVE or OWNER member of this organization to perform this action.
```

### Metadata Validation
```
Metadata validation failed. Keys must be namespaced (fact.*, project.*, ui.*, ai.*). Forbidden keywords detected.
```

---

## Status Messages

### Success: Idea Created
```
Idea created. Phase set to 'draft'. This idea has no legal or procedural power.
```

### Success: Comment Added
```
Comment added. Comments are discussion only and have no voting or decision-making semantics.
```

### Success: Phase Changed
```
Phase changed to [phase]. This is a label change only and has no procedural meaning.
```

### Success: Resolution Draft Created
```
Draft resolution created. The resolution is in DRAFT status only and has no legal or procedural power until it goes through the Governance process.
```

---

## Empty States

### No Ideas
```
No ideas yet. Ideas are for discussion and planning only. They have no legal or procedural power.
```

### No Comments
```
No comments yet. Comments are discussion only and have no voting or decision-making semantics.
```

---

## Notes for Implementation

1. **Never use:** "approve", "adopt", "decide", "vote" (in procedural context), "progress", "advance", "complete", "finalize"
2. **Always clarify:** Ideas are discussion-only, have no legal power, require Governance module for any binding outcomes
3. **Phase language:** Use "label" not "status", "change" not "advance" or "progress"
4. **AI outputs:** Always marked as "interpretation only" and "no legal power"
5. **Confirmations:** Emphasize that actions create DRAFT only, never APPROVED

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0
