# Ideas / Planning Module - Phase UI Behavior Matrix

**Status:** PRE-GOVERNANCE  
**Purpose:** Define UI behavior rules for idea phases. Phases are labels only, not procedural states.

---

## Phase UI Behavior Matrix

| Phase | UI Label | Color Semantics | Allowed User Actions | Forbidden UI Elements | Mandatory Disclaimer Text |
|-------|----------|-----------------|---------------------|----------------------|---------------------------|
| **draft** | `Draft` | Neutral gray (`#6B7280` or equivalent). No status indication. | • View idea<br>• Edit title/content<br>• Add metadata<br>• Change phase to `discussion`<br>• Mark as `abandoned`<br>• Delete (if not snapshot) | • Progress indicators<br>• Success colors (green)<br>• Checkmarks<br>• "Complete" badges<br>• Status badges implying progress | None |
| **discussion** | `Discussion` | Neutral blue (`#3B82F6` or equivalent). Indicates activity, not approval. | • View idea<br>• Add comments<br>• Add objections<br>• Edit title/content (if not snapshot)<br>• Change phase to `refined` or `draft`<br>• Mark as `abandoned` | • Progress bars<br>• Success colors (green)<br>• "Active" badges with positive connotation<br>• Voting indicators<br>• Approval symbols | None |
| **refined** | `Refined` | Neutral purple (`#8B5CF6` or equivalent). Indicates revision, not completion. | • View idea<br>• Add comments<br>• Add objections<br>• Edit title/content (if not snapshot)<br>• Change phase to `discussion`, `ready_for_vote`, or `draft`<br>• Mark as `abandoned` | • Progress bars<br>• Success colors (green)<br>• "Complete" indicators<br>• Checkmarks<br>• Status badges implying finality | None |
| **ready_for_vote** | `Ready for Resolution Draft` | Neutral amber/yellow (`#F59E0B` or equivalent). Warning-like color, NOT success. Must look like a caution, not approval. | • View idea<br>• View comments<br>• View objections<br>• Change phase to `refined` or `discussion`<br>• Promote to resolution draft (via RPC)<br>• Mark as `abandoned` | • Green/success colors<br>• Checkmarks<br>• "Ready" badges with positive connotation<br>• Progress bars<br>• "Complete" indicators<br>• Voting symbols<br>• Approval symbols<br>• Any element implying success or readiness for approval | **MANDATORY:** "This label indicates the idea may be converted to a draft resolution. Conversion requires explicit human action in Governance module. This label does not imply approval, adoption, or any legal or procedural power." |
| **abandoned** | `Abandoned` | Neutral muted gray (`#9CA3AF` or equivalent). Indicates inactivity, not failure. | • View idea (read-only)<br>• View comments<br>• View historical state | • Red/error colors<br>• "Failed" indicators<br>• Warning symbols<br>• Any element implying failure or error | None |

---

## Global UI Rules (All Phases)

### Forbidden Across All Phases
- ❌ Progress bars or progress indicators
- ❌ Success colors (green, emerald, teal with positive connotation)
- ❌ Checkmarks or completion symbols
- ❌ "Complete", "Done", "Finished" labels
- ❌ Voting symbols or voting indicators
- ❌ Approval symbols (checkmarks, seals, stamps)
- ❌ Status badges that imply procedural state
- ❌ Countdown timers or deadlines (unless clearly labeled as discussion deadlines)
- ❌ Percentage completion indicators

### Required Across All Phases
- ✅ Phase label must be clearly marked as "label only, no procedural meaning"
- ✅ All phase changes must show confirmation with disclaimer
- ✅ Color coding must be neutral and informational only
- ✅ No phase may use colors associated with success, approval, or completion

---

## Color Palette Guidelines

### Allowed Colors
- **Neutral grays:** `#6B7280`, `#9CA3AF`, `#D1D5DB` (informational, no status)
- **Neutral blues:** `#3B82F6`, `#60A5FA` (activity, not approval)
- **Neutral purples:** `#8B5CF6`, `#A78BFA` (revision, not completion)
- **Neutral amber/yellow:** `#F59E0B`, `#FBBF24` (caution, not success - for ready_for_vote only)
- **Muted grays:** `#9CA3AF`, `#6B7280` (inactive, not failure)

### Forbidden Colors
- ❌ Green (`#10B981`, `#34D399`, etc.) - implies success/approval
- ❌ Emerald/teal with positive connotation
- ❌ Red (`#EF4444`, etc.) - implies failure/error (unless clearly error state)
- ❌ Bright success indicators

---

## Phase Transition Rules

### Allowed Transitions
- `draft` → `discussion`, `abandoned`
- `discussion` → `refined`, `draft`, `abandoned`
- `refined` → `discussion`, `ready_for_vote`, `draft`, `abandoned`
- `ready_for_vote` → `refined`, `discussion`, `abandoned`
- `abandoned` → (no transitions - terminal state)

### Transition UI Requirements
1. All phase changes must show confirmation dialog
2. Confirmation must state: "This is a label change only and has no procedural meaning"
3. No automatic transitions - all require explicit user action
4. Transition buttons must use neutral colors (no success indicators)

---

## Special Rules for `ready_for_vote` Phase

### Visual Requirements
- **MUST** use amber/yellow warning-like color (`#F59E0B` or equivalent)
- **MUST NOT** use green, success colors, or positive indicators
- **MUST** display mandatory disclaimer text prominently
- **MUST** make it clear this is a caution/option, not approval readiness

### UI Elements
- Use warning-style icon (⚠️ or equivalent) if icon is needed
- Label must be full: "Ready for Resolution Draft" (not shortened)
- Button for promotion must say "Create Draft Resolution" (not "Approve" or "Ready")
- No checkmarks, success symbols, or positive indicators

---

## Implementation Notes

1. **Color Semantics:** All colors are informational only. No color implies status, approval, or procedural state.

2. **Phase Labels:** Always display phase as "label" not "status" in tooltips and help text.

3. **Actions:** All phase-related actions must include disclaimers that emphasize no procedural meaning.

4. **Visual Hierarchy:** Use typography and spacing for hierarchy, not color-based status indicators.

5. **Accessibility:** Ensure color choices meet WCAG contrast requirements. Do not rely solely on color to convey information.

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0
