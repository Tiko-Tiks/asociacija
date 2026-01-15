# Pilot Results Analysis Protocol - Ideas / Planning Module

**Module:** Ideas / Planning (PRE-GOVERNANCE)  
**Purpose:** Structured protocol for analyzing pilot test results  
**Tone:** Analytical, conservative, governance-first

---

## 1. Analysis Principles

### Core Principles

**Facts First, Interpretation Last:**
- Analysis begins with raw data (quotes, observations, timestamps)
- Interpretation follows only after all facts are categorized
- No assumptions about user intent without explicit evidence
- No design opinions or feature proposals in analysis phase

**No Assumptions:**
- Do not assume users "meant" something different from what they said
- Do not assume users "understood" based on actions alone
- Do not assume isolated incidents are not significant
- Do not assume patterns without sufficient evidence

**No Design Opinions:**
- Analysis does not propose UX improvements
- Analysis does not suggest feature additions
- Analysis does not recommend workflow changes
- Analysis identifies risks only, not solutions

**No Feature Proposals:**
- Analysis does not propose new functionality
- Analysis does not suggest feature expansions
- Analysis does not recommend technical enhancements
- Analysis focuses on interpretation risks only

**Governance-First:**
- Legal safety takes precedence over user convenience
- Procedural clarity takes precedence over ease of use
- Correct interpretation takes precedence over user satisfaction
- System integrity takes precedence over feature completeness

---

## 2. Input Data Structure

### Required Data Fields

**Observation Record:**
```
Timestamp: [YYYY-MM-DD HH:MM:SS]
Pilot Community: [Name]
Participant Role: [OWNER | ACTIVE | PENDING]
Scenario: [A | B | C | D | E | F | G]
Exact Quote: "[Verbatim user statement]"
Context: [What user was doing when statement was made]
Observer Tag: [confusion | false certainty | hesitation | correct understanding | red flag]
Observer Notes: [Any additional context - factual only]
```

**Survey Response Record:**
```
Timestamp: [YYYY-MM-DD HH:MM:SS]
Pilot Community: [Name]
Participant Role: [OWNER | ACTIVE | PENDING]
Scenario: [A | B | C | D | E | F | G]
Question: "[Exact question text]"
Exact Response: "[Verbatim user response]"
```

**Interview Record:**
```
Timestamp: [YYYY-MM-DD HH:MM:SS]
Pilot Community: [Name]
Participant Role: [OWNER | ACTIVE | PENDING]
Question: "[Exact question text]"
Exact Response: "[Verbatim user response]"
Follow-up Questions: [List if any]
```

### Data Organization Requirements

**Primary Organization:**
- Group by pilot community
- Sub-group by participant role
- Sub-group by scenario
- Chronological order within scenario

**Secondary Organization:**
- Group by observer tag (for pattern analysis)
- Group by exact quote keywords (for language analysis)
- Group by context (for interpretation analysis)

### Invalid Data for Analysis

**INVALID (Exclude from analysis):**
- ❌ Observer summaries or paraphrases (use exact quotes only)
- ❌ Observer opinions or interpretations
- ❌ Observer guesses about user intent
- ❌ Observer assumptions about user understanding
- ❌ Aggregated data without source quotes
- ❌ Second-hand reports (must be direct observation)
- ❌ Data from observers who violated protocols (teaching, correcting)

**VALID (Include in analysis):**
- ✅ Exact verbatim quotes from users
- ✅ Direct observation notes (factual only)
- ✅ Timestamped actions (what user did, not why)
- ✅ Survey responses (verbatim)
- ✅ Interview transcripts (verbatim)
- ✅ Red flag reports (with context)

---

## 3. Categorization Framework

### Category Definitions

#### Category 1: Correct Understanding (PRE-GOVERNANCE)

**Definition:** User explicitly demonstrates understanding that module is PRE-GOVERNANCE with no legal or procedural power.

**Indicators:**
- User states: "This is discussion only" or "This is not binding"
- User states: "Ideas don't create decisions"
- User states: "DRAFT means draft only, not approved"
- User states: "AI is advisory only"
- User states: "Comments are not votes"
- User uses neutral language: "created idea", "added comment", "created draft"

**Evidence Requirements:**
- Must be explicit statement, not inferred from action
- Must use clear language indicating understanding
- Must be verifiable from exact quote

**Tag:** `correct_understanding`

---

#### Category 2: False Approval Assumption

**Definition:** User believes an action created an approval, decision, or binding outcome.

**Indicators:**
- User states: "The idea is now approved"
- User states: "This is a decision now"
- User states: "The resolution is approved"
- User states: "We approved this idea"
- User asks: "Is this approved now?" after creating idea/changing phase/promoting
- User looks for approval confirmation or success indicators

**Evidence Requirements:**
- Must be explicit statement or clear behavioral indicator
- Must relate to approval, decision, or binding outcome
- Must be verifiable from exact quote or observation

**Tag:** `false_approval_assumption`

**Severity:** HIGH (procedural power illusion)

---

#### Category 3: False Voting Assumption

**Definition:** User believes comments, participants, or indicators represent votes or voting.

**Indicators:**
- User states: "5 people voted" (referring to comments)
- User states: "This has 3 votes" (referring to comment count)
- User states: "3 people support this" (referring to participant count)
- User states: "2 people voted against" (referring to objections)
- User interprets indicators as voting signals
- User asks: "How many votes does this have?"

**Evidence Requirements:**
- Must be explicit statement about voting
- Must relate to comments, participants, or indicators
- Must be verifiable from exact quote

**Tag:** `false_voting_assumption`

**Severity:** HIGH (procedural power illusion)

---

#### Category 4: False Project Activation Assumption

**Definition:** User believes promotion to DRAFT resolution activated a project or made it operational.

**Indicators:**
- User states: "The project is now active"
- User states: "The project is running now"
- User looks for project in Projects module
- User asks: "Where is the project?"
- User believes promotion created operational project

**Evidence Requirements:**
- Must be explicit statement about project activation
- Must relate to promotion to DRAFT resolution
- Must be verifiable from exact quote or observation

**Tag:** `false_project_activation_assumption`

**Severity:** HIGH (procedural power illusion)

---

#### Category 5: AI Authority Illusion

**Definition:** User treats AI content as authoritative, factual, or recommended.

**Indicators:**
- User states: "The AI says we should..."
- User states: "Is the AI correct?"
- User states: "Can I trust this AI?"
- User copies AI content directly to resolution text
- User treats AI suggestions as requirements
- User treats AI risks as rejection criteria
- User does not notice or understand AI disclaimers

**Evidence Requirements:**
- Must be explicit statement about AI authority
- Must relate to AI-generated content (summary, risks, suggestions)
- Must be verifiable from exact quote or action

**Tag:** `ai_authority_illusion`

**Severity:** MEDIUM (interpretation risk, not procedural power)

---

#### Category 6: Indicator-as-Vote Interpretation

**Definition:** User interprets runtime indicators (comment count, participant count, objection count) as voting or support signals.

**Indicators:**
- User states: "This idea has the most support" (referring to indicators)
- User states: "Which idea is most popular?" (referring to indicators)
- User tries to sort by "most popular" or "most supported"
- User interprets high indicator values as approval
- User interprets low indicator values as rejection

**Evidence Requirements:**
- Must be explicit statement about indicator interpretation
- Must relate to comment count, participant count, or objection count
- Must be verifiable from exact quote or action

**Tag:** `indicator_as_vote_interpretation`

**Severity:** MEDIUM (interpretation risk, not procedural power)

---

#### Category 7: Hesitation / Uncertainty Without False Certainty

**Definition:** User expresses confusion or uncertainty but does not make false assumptions.

**Indicators:**
- User asks: "What does this mean?" (without assuming)
- User states: "I'm not sure what this does"
- User hesitates before action
- User re-reads disclaimers multiple times
- User asks for clarification (without making assumptions)

**Evidence Requirements:**
- Must be explicit uncertainty without false assumption
- Must not include approval/voting/activation language
- Must be verifiable from exact quote

**Tag:** `hesitation_uncertainty`

**Severity:** LOW (user confusion, not procedural power illusion)

---

### Categorization Rules

**Single Category Per Observation:**
- Each observation is assigned to ONE primary category
- If observation fits multiple categories, assign to most severe
- Severity order: HIGH > MEDIUM > LOW

**Category Assignment Protocol:**
1. Read exact quote or observation
2. Match to category definition
3. Verify evidence requirements met
4. Assign category and tag
5. Note severity level

**Disagreement Resolution:**
- If multiple analysts disagree, include in both categories
- Note disagreement in analysis
- Present both interpretations in findings

---

## 4. Red Flag Aggregation

### Red Flag Definition

**Red Flag:** Any observation categorized as:
- `false_approval_assumption`
- `false_voting_assumption`
- `false_project_activation_assumption`

**Not Red Flags (but still tracked):**
- `ai_authority_illusion` (interpretation risk, not procedural power)
- `indicator_as_vote_interpretation` (interpretation risk, not procedural power)
- `hesitation_uncertainty` (user confusion, not procedural power)

### Counting and Grouping

**Counting Method:**
- Count each red flag observation once
- Do not double-count (one user statement = one red flag)
- Count by participant (not by community)
- Count by category (not aggregate)

**Grouping:**
- Group by category (approval, voting, activation)
- Group by scenario (which scenario triggered red flag)
- Group by role (OWNER, ACTIVE, PENDING)
- Group by community (which communities had red flags)

**Aggregation Metrics:**
- Total red flags per category
- Red flags per participant (average)
- Red flags per community (average)
- Red flags per scenario
- Red flags by role distribution

### Thresholds That Force Architectural Action

**STOP Threshold (Critical):**
- **>30% of participants** have red flags in any category
- **>50% of communities** have red flags
- **>20% of participants** have red flags in multiple categories
- **Systemic pattern:** Red flags occur in >50% of scenarios

**HOLD Threshold (Warning):**
- **20-30% of participants** have red flags
- **30-50% of communities** have red flags
- **10-20% of participants** have red flags in multiple categories
- **Pattern:** Red flags occur in 30-50% of scenarios

**GO Threshold (Acceptable):**
- **<20% of participants** have red flags
- **<30% of communities** have red flags
- **<10% of participants** have red flags in multiple categories
- **Isolated:** Red flags occur in <30% of scenarios

### Isolated vs. Systemic Failure

**Isolated Failure:**
- Red flags occur in <20% of participants
- Red flags occur in single scenario or context
- Red flags are not repeated across communities
- Red flags do not form patterns

**Systemic Failure:**
- Red flags occur in >30% of participants
- Red flags occur across multiple scenarios
- Red flags form clear patterns (same misinterpretation)
- Red flags occur across multiple communities

**Analysis Protocol:**
1. Count total red flags
2. Calculate percentage of participants with red flags
3. Identify patterns (same misinterpretation across users)
4. Determine if isolated or systemic
5. Apply threshold rules

---

## 5. Decision Framework (GO / HOLD / STOP)

### GO: Module Safe for Wider Use

**Criteria:**
- ✅ **<20% of participants** have red flags
- ✅ **<30% of communities** have red flags
- ✅ Red flags are isolated (not systemic)
- ✅ No category exceeds 15% red flag rate
- ✅ Correct understanding rate >80%

**Interpretation:**
- Module does not create procedural power illusions
- Users correctly understand PRE-GOVERNANCE nature
- Misinterpretations are isolated incidents
- No architectural changes required

**Action:**
- Proceed to wider deployment
- Monitor for patterns in production
- Document isolated incidents for future reference

---

### HOLD: Limited Corrections Required

**Criteria:**
- ⚠️ **20-30% of participants** have red flags
- ⚠️ **30-50% of communities** have red flags
- ⚠️ Red flags show patterns but not systemic failure
- ⚠️ One category exceeds 15% but <30% red flag rate
- ⚠️ Correct understanding rate 60-80%

**Interpretation:**
- Module creates some interpretation risks
- Users show confusion but not systemic misunderstanding
- Language or visual changes may resolve issues
- No architectural changes required

**Action:**
- Implement language fixes (disclaimers, labels)
- Implement visual fixes (colors, icons)
- Re-test with corrections
- Do NOT proceed to wider deployment until corrections tested

**Allowed Corrections:**
- Language: Add disclaimers, clarify labels
- Visual: Adjust colors, add warning icons
- Procedural guards: Add confirmation checkboxes

**Forbidden Corrections:**
- Feature additions
- Workflow changes
- Technical refactors (unless risk-critical)

---

### STOP: Architectural Breach

**Criteria:**
- ❌ **>30% of participants** have red flags
- ❌ **>50% of communities** have red flags
- ❌ Red flags are systemic (clear patterns)
- ❌ Any category exceeds 30% red flag rate
- ❌ Correct understanding rate <60%

**Interpretation:**
- Module creates procedural power illusions
- Users systematically misunderstand module purpose
- Language/visual fixes insufficient
- Architectural changes required

**Action:**
- STOP deployment immediately
- Conduct architectural review
- Identify root cause of misinterpretation
- Redesign module to eliminate procedural power illusions
- Re-pilot after architectural changes

**Required Actions:**
- Identify which aspect creates procedural power illusion
- Determine if module can be fixed or must be redesigned
- Document architectural breach
- Propose architectural changes (not features)

---

## 6. Output Format

### Executive Summary (Max 1 Page)

**Structure:**
1. **Pilot Overview:**
   - Number of participants
   - Number of communities
   - Duration
   - Scenarios tested

2. **Key Findings:**
   - Total red flags (count and percentage)
   - Red flags by category
   - Correct understanding rate
   - Isolated vs. systemic assessment

3. **Decision:**
   - GO / HOLD / STOP recommendation
   - Rationale (one paragraph)

4. **Critical Risks:**
   - Top 3 interpretation risks identified
   - Severity assessment

**Format:** Bullet points, no narrative, facts only.

---

### Evidence Table (Quotes Only, No Paraphrasing)

**Structure:**
```
| Category | Quote | Role | Scenario | Context |
|----------|-------|------|----------|---------|
| false_approval_assumption | "[Exact quote]" | OWNER | F | User viewing "Create Draft Resolution" button |
| false_voting_assumption | "[Exact quote]" | ACTIVE | D | User viewing comment count indicator |
| ... | ... | ... | ... | ... |
```

**Rules:**
- Exact quotes only (verbatim)
- No paraphrasing or summarization
- Include context for each quote
- Group by category
- Sort by severity (HIGH first)

**Evidence Requirements:**
- Minimum 3 quotes per category (if category has observations)
- All red flag quotes must be included
- Representative sample of other categories

---

### Risk Classification

**Structure:**

**HIGH RISK (Procedural Power Illusion):**
- Category: [Name]
- Count: [Number]
- Percentage: [%]
- Pattern: [Isolated / Systemic]
- Evidence: [Reference to evidence table]

**MEDIUM RISK (Interpretation Risk):**
- Category: [Name]
- Count: [Number]
- Percentage: [%]
- Pattern: [Isolated / Systemic]
- Evidence: [Reference to evidence table]

**LOW RISK (User Confusion):**
- Category: [Name]
- Count: [Number]
- Percentage: [%]
- Pattern: [Isolated / Systemic]
- Evidence: [Reference to evidence table]

---

### Mandatory Recommendations Type

**Language Fix:**
- **Type:** Text changes only
- **Scope:** Labels, disclaimers, tooltips, confirmation text
- **Examples:**
  - "Change 'Ready for Vote' to 'Ready for Resolution Draft'"
  - "Add disclaimer: 'This creates DRAFT only, no approval'"
  - "Clarify tooltip text for indicators"

**Visual Fix:**
- **Type:** Color, icon, layout changes only
- **Scope:** Visual treatment, no functional changes
- **Examples:**
  - "Change ready_for_vote phase color from green to amber"
  - "Add warning icon to AI sections"
  - "Increase visual separation of AI content"

**Procedural Guard:**
- **Type:** Additional confirmation or validation
- **Scope:** Checkboxes, confirmations, validation rules
- **Examples:**
  - "Add confirmation checkbox: 'I understand this creates DRAFT only'"
  - "Require explicit confirmation for phase change to ready_for_vote"
  - "Add validation: Cannot promote if objections exist (if needed)"

**Forbidden Recommendations:**
- ❌ Feature additions
- ❌ Workflow changes
- ❌ Technical refactors (unless risk-critical)
- ❌ UX redesigns
- ❌ New functionality

---

## 7. Explicit Non-Goals

### What This Analysis Does NOT Do

**No Roadmap:**
- Analysis does not create feature roadmap
- Analysis does not propose future enhancements
- Analysis does not suggest module expansion
- Analysis focuses on current state only

**No UX Redesign:**
- Analysis does not propose UI redesigns
- Analysis does not suggest workflow changes
- Analysis does not recommend major UX overhauls
- Analysis identifies risks, not solutions

**No Technical Refactors:**
- Analysis does not propose schema changes
- Analysis does not suggest RPC modifications
- Analysis does not recommend trigger changes
- Analysis focuses on interpretation, not implementation

**No Feature Expansion:**
- Analysis does not propose new features
- Analysis does not suggest functionality additions
- Analysis does not recommend module enhancements
- Analysis evaluates existing functionality only

**No Product Language:**
- Analysis does not use growth or product terminology
- Analysis does not focus on user satisfaction
- Analysis does not prioritize convenience
- Analysis prioritizes legal safety and procedural clarity

---

## 8. Analysis Workflow

### Step 1: Data Collection
- [ ] Gather all observation records
- [ ] Gather all survey responses
- [ ] Gather all interview transcripts
- [ ] Verify data completeness
- [ ] Exclude invalid data (summaries, opinions)

### Step 2: Data Organization
- [ ] Organize by pilot community
- [ ] Organize by participant role
- [ ] Organize by scenario
- [ ] Create chronological timeline

### Step 3: Categorization
- [ ] Read each observation/quote
- [ ] Match to category definition
- [ ] Assign category and tag
- [ ] Note severity level
- [ ] Resolve disagreements (if multiple analysts)

### Step 4: Red Flag Aggregation
- [ ] Count red flags by category
- [ ] Calculate percentages
- [ ] Identify patterns
- [ ] Determine isolated vs. systemic

### Step 5: Threshold Assessment
- [ ] Calculate participant red flag rate
- [ ] Calculate community red flag rate
- [ ] Calculate category red flag rates
- [ ] Assess against GO/HOLD/STOP thresholds

### Step 6: Decision Framework
- [ ] Apply GO/HOLD/STOP criteria
- [ ] Determine recommendation
- [ ] Document rationale

### Step 7: Output Generation
- [ ] Write executive summary
- [ ] Create evidence table
- [ ] Classify risks
- [ ] Generate recommendations (if HOLD/STOP)

### Step 8: Review
- [ ] Verify all data included
- [ ] Verify no assumptions made
- [ ] Verify no feature proposals
- [ ] Verify governance-first tone

---

## 9. Quality Assurance

### Analysis Quality Checklist

**Data Integrity:**
- [ ] All quotes are verbatim (not paraphrased)
- [ ] All timestamps are accurate
- [ ] All context is factual (not interpreted)
- [ ] No invalid data included

**Categorization Accuracy:**
- [ ] Each observation assigned to correct category
- [ ] Severity levels are accurate
- [ ] Evidence requirements met for each category
- [ ] No assumptions made about user intent

**Red Flag Counting:**
- [ ] Red flags counted correctly (no double-counting)
- [ ] Percentages calculated accurately
- [ ] Patterns identified correctly
- [ ] Isolated vs. systemic assessment is accurate

**Decision Framework:**
- [ ] GO/HOLD/STOP criteria applied correctly
- [ ] Recommendation is justified by data
- [ ] Rationale is clear and factual
- [ ] No design opinions in decision

**Output Quality:**
- [ ] Executive summary is factual (no opinions)
- [ ] Evidence table contains exact quotes only
- [ ] Risk classification is accurate
- [ ] Recommendations are appropriate type (language/visual/guard)

---

## 10. Example Analysis Output

### Executive Summary Example

**Pilot Overview:**
- Participants: 12 (4 OWNER, 5 ACTIVE, 3 PENDING)
- Communities: 3
- Duration: 7 days
- Scenarios: A-G (all completed)

**Key Findings:**
- Total red flags: 8 (6.7% of participants)
- Red flags by category:
  - false_approval_assumption: 3 (2.5%)
  - false_voting_assumption: 4 (3.3%)
  - false_project_activation_assumption: 1 (0.8%)
- Correct understanding rate: 85%
- Assessment: Isolated (not systemic)

**Decision:**
- **GO** - Module safe for wider use
- Rationale: Red flag rate (6.7%) is below 20% threshold. Red flags are isolated incidents, not systemic patterns. Correct understanding rate (85%) exceeds 80% threshold.

**Critical Risks:**
1. False voting assumption (3.3%) - users interpret comment counts as votes
2. False approval assumption (2.5%) - users believe promotion creates approval
3. AI authority illusion (not red flag, but tracked) - some users treat AI as authoritative

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0  
**Document Status:** [Draft / Approved / Active]
