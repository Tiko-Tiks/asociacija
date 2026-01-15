# Ideas / Planning Module - Promote to DRAFT Resolution UX

**Status:** PRE-GOVERNANCE  
**Purpose:** Define UX flow for promoting idea to DRAFT resolution. No decision, approval, or voting occurs.

---

## Button Label

### Primary Action Button
**Label:** `Create Draft Resolution`  
**Location:** Idea detail view, visible only when `phase = 'ready_for_vote'`  
**Visual Treatment:** Neutral button (gray/blue, not green/success)  
**Icon:** Document icon (📄) or equivalent - not checkmark or success symbol

### Tooltip (On Hover)
```
Create a draft resolution from this idea. The resolution will be in DRAFT status only. 
No approval or adoption occurs. This action requires explicit confirmation.
```

---

## Confirmation Modal

### Modal Title
```
Create Draft Resolution
```

### Modal Body Text
```
This action will create a DRAFT resolution from the idea:

"[Idea Title]"

Important:
• The resolution will be created in DRAFT status only
• No decision, approval, or adoption occurs
• The resolution has no legal or procedural power
• Governance actions require explicit human action in the Governance module
• The resolution must go through the Governance process to have any effect

This is a technical action only. No procedural meaning is implied.
```

### Confirmation Checkbox
**Required:** Yes  
**Label:** `I understand this creates a DRAFT resolution only, with no legal or procedural power`  
**Default State:** Unchecked  
**Validation:** Must be checked to enable confirmation button

### Button Labels

#### Confirm Button
**Label:** `Create Draft Resolution`  
**Visual Treatment:** Neutral button (gray/blue, not green)  
**Icon:** Document icon (📄) - not checkmark  
**State:** Disabled until checkbox is checked

#### Cancel Button
**Label:** `Cancel`  
**Visual Treatment:** Secondary button (outline style)  
**Action:** Close modal without creating resolution

---

## Post-Action Behavior

### Navigation Destination
**Destination:** Governance module - Resolution detail view (DRAFT resolution)  
**Alternative (if Governance not accessible):** Ideas module - Idea detail view with status message

### Status Message (Success)
**Message Type:** Informational (not success)  
**Visual Treatment:** Neutral blue/gray banner, not green  
**Icon:** Information icon (ℹ️), not checkmark

**Message Text:**
```
Draft resolution created. The resolution is in DRAFT status only and has no legal or procedural power until it goes through the Governance process.

Resolution ID: [resolution_id]
```

**Action Link (if applicable):**
```
[View Draft Resolution] → (links to Governance module)
```

### Error Messages

#### Idea Not in Correct Phase
```
Cannot create draft resolution. Idea must be in 'ready_for_vote' phase.
```

#### Permission Denied
```
You must be an ACTIVE or OWNER member of this organization to create draft resolutions.
```

#### Snapshot Detected
```
Cannot create draft resolution from snapshot ideas. Only original ideas can be promoted.
```

#### System Error
```
An error occurred while creating the draft resolution. Please try again or contact support.
```

---

## Explicitly Forbidden UX Patterns

### Visual Treatment
- ❌ **FORBIDDEN:** Green/success colors on button or confirmation
- ❌ **FORBIDDEN:** Checkmark icons or success symbols
- ❌ **FORBIDDEN:** "Success" or "Approved" badges after action
- ❌ **FORBIDDEN:** Progress indicators showing "completion" or "approval"
- ❌ **FORBIDDEN:** Celebration animations or confetti effects
- ❌ **FORBIDDEN:** Positive emoji (✅, 🎉, 👍) in success messages

### Language and Wording
- ❌ **FORBIDDEN:** "Approve Idea" or "Approve Resolution"
- ❌ **FORBIDDEN:** "Ready for Approval" or "Approval Ready"
- ❌ **FORBIDDEN:** "Successfully Created" (use "Created" only)
- ❌ **FORBIDDEN:** "Resolution Approved" or "Resolution Adopted"
- ❌ **FORBIDDEN:** "Idea Promoted" (implies advancement/success)
- ❌ **FORBIDDEN:** "Complete" or "Finished"
- ❌ **FORBIDDEN:** Words implying readiness: "Ready", "Complete", "Final"
- ❌ **FORBIDDEN:** Words implying success: "Success", "Approved", "Accepted"

### Modal Content
- ❌ **FORBIDDEN:** "Are you sure you want to approve this idea?"
- ❌ **FORBIDDEN:** "This will approve the resolution"
- ❌ **FORBIDDEN:** "Ready to approve?" or "Approve now?"
- ❌ **FORBIDDEN:** Success indicators in modal body
- ❌ **FORBIDDEN:** Positive language: "Great!", "Excellent choice!"

### Post-Action Behavior
- ❌ **FORBIDDEN:** Auto-navigation to "approved resolutions" list
- ❌ **FORBIDDEN:** Status message with green/success styling
- ❌ **FORBIDDEN:** "Resolution approved successfully" messages
- ❌ **FORBIDDEN:** Celebration or success animations
- ❌ **FORBIDDEN:** Auto-highlighting as "approved" or "successful"

### Automation
- ❌ **FORBIDDEN:** Auto-approval of resolution after creation
- ❌ **FORBIDDEN:** Auto-sending notifications about "approval"
- ❌ **FORBIDDEN:** Auto-updating idea status to "approved"
- ❌ **FORBIDDEN:** Auto-creating projects from resolution
- ❌ **FORBIDDEN:** Any automation that implies approval or adoption

### Button Placement and Context
- ❌ **FORBIDDEN:** Button in "Approval" or "Actions" section
- ❌ **FORBIDDEN:** Button grouped with "Approve" or "Adopt" actions
- ❌ **FORBIDDEN:** Button near voting or decision-making UI elements
- ❌ **FORBIDDEN:** Button in success-colored section

---

## Complete UX Flow

### Step 1: Button Display
- Button visible only when `phase = 'ready_for_vote'`
- Button uses neutral colors (gray/blue)
- Tooltip explains DRAFT-only outcome

### Step 2: Button Click
- Modal opens immediately
- Modal shows warning-style treatment (amber/yellow border, not green)
- Checkbox is unchecked by default
- Confirm button is disabled

### Step 3: User Confirmation
- User reads body text (explains DRAFT only, no approval)
- User checks confirmation checkbox
- Confirm button becomes enabled
- User clicks "Create Draft Resolution"

### Step 4: Processing
- Show loading state: "Creating draft resolution..."
- No success indicators during processing
- Neutral spinner/loading indicator

### Step 5: Completion
- Show informational message (not success)
- Message clearly states DRAFT only, no legal power
- Provide link to view resolution in Governance module
- Navigate to Governance module (resolution detail view)

---

## Alternative Flows

### Flow A: User Cancels
1. User clicks "Cancel" button
2. Modal closes
3. No action taken
4. User remains on idea detail view

### Flow B: User Closes Modal (X button)
1. User clicks X or clicks outside modal
2. Modal closes
3. No action taken
4. User remains on idea detail view

### Flow C: Error During Creation
1. Error message displayed in modal or inline
2. Modal remains open (if modal error) or closes (if inline error)
3. User can retry or cancel
4. No resolution created

---

## Accessibility Requirements

### Keyboard Navigation
- Modal focus trap (cannot tab outside modal)
- Escape key closes modal
- Tab order: Checkbox → Confirm → Cancel
- Enter key on Confirm button (when enabled) creates resolution

### Screen Reader Support
- Modal title announced: "Create Draft Resolution"
- Body text clearly explains DRAFT-only outcome
- Checkbox label clearly states requirement
- Button labels clearly state action
- Success message clearly states DRAFT status

### Visual Indicators
- Focus indicators on all interactive elements
- Clear visual distinction between enabled/disabled states
- High contrast for all text (WCAG AA minimum)

---

## Implementation Checklist

### Button
- [ ] Label: "Create Draft Resolution" (exact wording)
- [ ] Neutral colors (gray/blue, not green)
- [ ] Document icon (not checkmark)
- [ ] Tooltip with disclaimer
- [ ] Visible only when `phase = 'ready_for_vote'`

### Modal
- [ ] Title: "Create Draft Resolution"
- [ ] Body text explains DRAFT only, no approval
- [ ] Warning-style visual treatment (amber, not green)
- [ ] Checkbox required and unchecked by default
- [ ] Confirm button disabled until checkbox checked
- [ ] Cancel button always enabled

### Post-Action
- [ ] Informational message (not success)
- [ ] Message states DRAFT only, no legal power
- [ ] Neutral colors (blue/gray, not green)
- [ ] Information icon (not checkmark)
- [ ] Link to Governance module
- [ ] Navigation to resolution detail view

### Forbidden Patterns
- [ ] No green/success colors
- [ ] No checkmark icons
- [ ] No approval language
- [ ] No success animations
- [ ] No auto-approval
- [ ] No positive emoji

---

## Example: Correct vs. Incorrect Implementation

### ❌ INCORRECT
```
[Button: "Approve Idea" - Green color, checkmark icon]

Modal:
"Are you sure you want to approve this idea?"
✅ Success! Your idea has been approved!

[Button: "Approve Now" - Green, checkmark]

After action:
✅ Success! Resolution approved!
[Green success banner with checkmark]
```

### ✅ CORRECT
```
[Button: "Create Draft Resolution" - Gray/blue, document icon]

Modal:
"Create Draft Resolution"

"This action will create a DRAFT resolution from the idea:
'[Idea Title]'

Important:
• The resolution will be created in DRAFT status only
• No decision, approval, or adoption occurs
• The resolution has no legal or procedural power
• Governance actions require explicit human action in the Governance module

☐ I understand this creates a DRAFT resolution only, with no legal or procedural power

[Create Draft Resolution] [Cancel]"

After action:
ℹ️ Draft resolution created. The resolution is in DRAFT status only and has no legal or procedural power until it goes through the Governance process.

Resolution ID: [resolution_id]
[View Draft Resolution]
```

---

## Rationale: Why These Safeguards Are Necessary

### 1. Legal Safety
Promotion creates a DRAFT only, not an approved resolution. Clear language and neutral visuals prevent users from believing a decision or approval has occurred.

### 2. Procedural Safety
No governance action occurs in the Ideas module. Explicit confirmation and clear disclaimers ensure users understand they are creating a draft, not making a decision.

### 3. Transparency
Users must understand the technical nature of the action. Checkbox confirmation and detailed body text provide this transparency.

### 4. No Authority Implication
Neutral colors and language prevent the action from appearing authoritative or successful. No green/success visuals ensures no approval semantics.

### 5. Human-in-the-Loop
All governance decisions require explicit human action in the Governance module. This flow creates a draft only, requiring separate governance actions later.

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0
