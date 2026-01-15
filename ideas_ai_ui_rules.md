# Ideas / Planning Module - AI UI Rules

**Status:** PRE-GOVERNANCE  
**Purpose:** Define UI rules for AI-generated content. AI outputs are interpretative only and have no legal or procedural power.

---

## AI Card Structure

### Header
```
┌─────────────────────────────────────────────────────────┐
│ [⚠️] AI-Generated [Summary | Risks | Suggestions]      │
│      Interpretation Only - No Legal Power               │
│      [▼ Expand] / [▲ Collapse]                          │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- Warning icon (⚠️) - mandatory
- Content type label: "AI-Generated Summary" / "AI-Generated Risks" / "AI-Generated Suggestions"
- Subtitle: "Interpretation Only - No Legal Power"
- Expand/Collapse toggle (collapsed by default)

### Body (Expanded State)
```
┌─────────────────────────────────────────────────────────┐
│ [⚠️] AI-Generated Summary                               │
│      Interpretation Only - No Legal Power                │
│      [▲ Collapse]                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [AI-generated content here]                             │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ ⚠️ This content is AI-generated interpretation only.   │
│    It has no legal or procedural power. Review          │
│    carefully before any action.                          │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- AI-generated content (clearly marked)
- Footer disclaimer (mandatory, always visible when expanded)

### Footer (Always Visible When Expanded)
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ This content is AI-generated interpretation only.   │
│    It has no legal or procedural power. Review          │
│    carefully before any action.                          │
│                                                          │
│    AI data is advisory only. All decisions require      │
│    explicit human action in the Governance module.      │
└─────────────────────────────────────────────────────────┘
```

---

## Visual Treatment Rules

### Colors
- **Background:** Light neutral gray (`#F3F4F6` or equivalent) - distinct from human content
- **Border:** Neutral gray (`#D1D5DB`) with 2px solid border
- **Header background:** Slightly darker gray (`#E5E7EB`) to distinguish from body
- **Text:** Neutral dark gray (`#374151`) - no emphasis colors
- **Warning icon:** Amber/yellow (`#F59E0B`) - caution, not error
- **Forbidden:** Green (success), blue (authority), red (error/authority)

### Typography
- **Header:** Bold, 14px, neutral gray
- **Subtitle:** Regular, 12px, muted gray
- **Body content:** Regular, 14px, neutral dark gray
- **Disclaimer:** Regular, 12px, muted gray, italic

### Spacing and Layout
- **Margin:** 16px margin from human content on all sides
- **Padding:** 12px internal padding
- **Border radius:** 4px (subtle, not prominent)
- **Visual separation:** Horizontal rule or border between AI sections and human content

### Collapse Behavior
- **Default state:** Collapsed (content hidden)
- **Expanded state:** Shows full content with footer disclaimer
- **Animation:** Smooth expand/collapse (200ms transition)
- **Persistence:** User preference may be saved per session (not per idea)

### Icons and Indicators
- **Warning icon (⚠️):** Required in header and footer
- **Expand/Collapse:** Chevron down (▼) / up (▲) or equivalent
- **No checkmarks, success indicators, or approval symbols**

---

## Mandatory Disclaimer Text

### Header Subtitle (Always Visible)
```
Interpretation Only - No Legal Power
```

### Footer Disclaimer (Visible When Expanded)
```
⚠️ This content is AI-generated interpretation only. It has no legal or procedural power. Review carefully before any action.

AI data is advisory only. All decisions require explicit human action in the Governance module.
```

### Tooltip (On Hover Over AI Section)
```
AI-generated content is interpretative only. It has no legal or procedural power. AI outputs are advisory and do not create facts, decisions, or audit records.
```

### Content Type-Specific Disclaimers

#### AI-Generated Summary
```
This summary is AI-generated interpretation only. It has no legal or procedural power. Review carefully before any action.
```

#### AI-Generated Risks
```
This risk assessment is AI-generated interpretation only. It is advisory and has no legal or procedural power.
```

#### AI-Generated Suggestions
```
These suggestions are AI-generated interpretation only. They are advisory and have no legal or procedural power.
```

---

## Allowed User Actions

### Viewing
- ✅ Expand/collapse AI sections
- ✅ Read AI-generated content
- ✅ Copy AI text to clipboard (with disclaimer notice)
- ✅ Print AI content (disclaimer must be included)

### Interaction
- ✅ Dismiss AI section (hide from view, not delete)
- ✅ Provide feedback on AI quality (non-binding, analytics only)
- ✅ Report incorrect or inappropriate AI content

### Content Use
- ✅ Reference AI content in human-written comments
- ✅ Use AI content as discussion starting point
- ✅ Manually incorporate AI insights into human-written text (with attribution)

---

## Explicitly Forbidden Interactions

### Direct Actions
- ❌ **FORBIDDEN:** Copy AI content directly into resolution text
- ❌ **FORBIDDEN:** Copy AI content directly into project descriptions
- ❌ **FORBIDDEN:** Use AI content as-is in governance documents
- ❌ **FORBIDDEN:** Auto-populate any governance field with AI content
- ❌ **FORBIDDEN:** Pre-fill forms with AI-generated text

### Automation
- ❌ **FORBIDDEN:** Automatic phase transitions based on AI content
- ❌ **FORBIDDEN:** Automatic promotion to resolution based on AI assessment
- ❌ **FORBIDDEN:** Automatic alerts based on AI risk assessment
- ❌ **FORBIDDEN:** Any automation that treats AI as authoritative

### Visual Treatment
- ❌ **FORBIDDEN:** Display AI content with success colors (green)
- ❌ **FORBIDDEN:** Display AI content with authority colors (blue, official)
- ❌ **FORBIDDEN:** Use checkmarks or approval symbols near AI content
- ❌ **FORBIDDEN:** Highlight AI content as "recommended" or "suggested"
- ❌ **FORBIDDEN:** Show AI content expanded by default
- ❌ **FORBIDDEN:** Blend AI content visually with human content

### Labeling and Wording
- ❌ **FORBIDDEN:** Label AI content as "Recommended", "Suggested", "Best Practice"
- ❌ **FORBIDDEN:** Use words implying correctness: "Correct", "Accurate", "Valid"
- ❌ **FORBIDDEN:** Use words implying quality: "High Quality", "Excellent", "Good"
- ❌ **FORBIDDEN:** Use words implying authority: "Authoritative", "Official", "Certified"
- ❌ **FORBIDDEN:** Use words implying recommendation: "Should", "Must", "Recommended"

### Integration
- ❌ **FORBIDDEN:** Link AI content directly to Governance module
- ❌ **FORBIDDEN:** Link AI content directly to Projects module
- ❌ **FORBIDDEN:** Pre-select options based on AI content
- ❌ **FORBIDDEN:** Auto-fill metadata based on AI content
- ❌ **FORBIDDEN:** Use AI content to validate or approve actions

### Comparison and Ranking
- ❌ **FORBIDDEN:** Compare AI assessments between ideas
- ❌ **FORBIDDEN:** Rank ideas based on AI content
- ❌ **FORBIDDEN:** Highlight "best" ideas based on AI assessment
- ❌ **FORBIDDEN:** Use AI content to filter or sort ideas

---

## Content Type Specifications

### AI-Generated Summary
**Purpose:** Interpretive summary of idea content  
**Display:** Collapsed by default, expandable  
**Disclaimer:** "This summary is AI-generated interpretation only. It has no legal or procedural power."  
**Forbidden:** Using summary as official description, copying to resolution text

### AI-Generated Risks
**Purpose:** Interpretive risk assessment  
**Display:** Collapsed by default, expandable  
**Disclaimer:** "This risk assessment is AI-generated interpretation only. It is advisory and has no legal or procedural power."  
**Forbidden:** Using risks to block phase transitions, auto-rejecting ideas based on AI risks

### AI-Generated Suggestions
**Purpose:** Interpretive suggestions for improvement  
**Display:** Collapsed by default, expandable  
**Disclaimer:** "These suggestions are AI-generated interpretation only. They are advisory and have no legal or procedural power."  
**Forbidden:** Auto-applying suggestions, treating suggestions as requirements

---

## Implementation Checklist

### Visual Requirements
- [ ] AI sections use distinct background color (light gray)
- [ ] AI sections have visible border (2px, neutral gray)
- [ ] Warning icon (⚠️) in header and footer
- [ ] All AI sections collapsed by default
- [ ] Footer disclaimer always visible when expanded
- [ ] No success/authority colors used

### Text Requirements
- [ ] Header subtitle: "Interpretation Only - No Legal Power"
- [ ] Footer disclaimer with exact wording
- [ ] Tooltip on hover with disclaimer
- [ ] Content-type-specific disclaimers
- [ ] No words implying correctness, quality, or recommendation

### Interaction Requirements
- [ ] Expand/collapse functionality works
- [ ] No direct copy to governance fields
- [ ] No automation based on AI content
- [ ] No visual blending with human content
- [ ] Copy to clipboard includes disclaimer notice

### Functional Requirements
- [ ] AI content clearly separated from human content
- [ ] No auto-population of governance fields
- [ ] No automatic phase transitions
- [ ] No links directly to Governance/Projects modules
- [ ] All user actions require explicit confirmation

---

## Example: Correct vs. Incorrect Implementation

### ❌ INCORRECT
```
┌─────────────────────────────────────┐
│ ✅ Recommended Summary              │
│    [AI content - expanded by default]
│    This idea looks good!            │
└─────────────────────────────────────┘

[Button: "Use AI Summary in Resolution"]
```

### ✅ CORRECT
```
┌─────────────────────────────────────────────────────────┐
│ [⚠️] AI-Generated Summary                              │
│      Interpretation Only - No Legal Power               │
│      [▼ Expand]                                        │
└─────────────────────────────────────────────────────────┘

[When expanded:]
┌─────────────────────────────────────────────────────────┐
│ [⚠️] AI-Generated Summary                              │
│      Interpretation Only - No Legal Power               │
│      [▲ Collapse]                                       │
├─────────────────────────────────────────────────────────┤
│ [AI-generated content]                                  │
├─────────────────────────────────────────────────────────┤
│ ⚠️ This content is AI-generated interpretation only.   │
│    It has no legal or procedural power. Review          │
│    carefully before any action.                          │
│                                                          │
│    AI data is advisory only. All decisions require      │
│    explicit human action in the Governance module.      │
└─────────────────────────────────────────────────────────┘
```

---

## Rationale: Why These Rules Are Necessary

### 1. Legal Safety
AI outputs are interpretations, not facts or decisions. Clear visual and textual separation prevents AI content from being treated as authoritative or legally binding.

### 2. Procedural Safety
AI must not influence governance automatically. Collapsed-by-default and explicit disclaimers ensure human review before any governance action.

### 3. Transparency
Users must always know they are viewing AI-generated content, not human-authored or system-generated facts. Visual distinction and mandatory disclaimers provide this transparency.

### 4. Human-in-the-Loop
All governance decisions require explicit human action. Forbidding direct insertion and automation ensures AI remains advisory only.

### 5. No Authority Implication
AI content must never appear authoritative, official, or recommended. Neutral colors, warning icons, and collapsed-by-default prevent authority implications.

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0
