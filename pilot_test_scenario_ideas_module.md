# Pilot Testing Scenario - Ideas / Planning Module (PRE-GOVERNANCE)

**Module:** Ideas / Planning  
**Status:** PRE-GOVERNANCE  
**Duration:** 7 days  
**Purpose:** Test human interpretation, not technical correctness

---

## 1. Pilot Goals

### Primary Risk: Misinterpretation of Module Purpose

**Risk 1: Users perceive ideas as votes or decisions**
- **Test:** Do users believe creating an idea or marking it "ready_for_vote" creates a decision?
- **Success:** Users understand ideas are discussion-only, no decisions are made

**Risk 2: Users perceive phase transitions as approvals**
- **Test:** Do users believe changing phase to "ready_for_vote" means approval or readiness?
- **Success:** Users understand phases are labels only, no procedural meaning

**Risk 3: Users perceive promotion to DRAFT as approval**
- **Test:** Do users believe creating a DRAFT resolution means the idea is approved?
- **Success:** Users understand DRAFT means draft only, no approval occurred

**Risk 4: Users perceive AI outputs as authoritative**
- **Test:** Do users treat AI summaries/risks/suggestions as facts or recommendations?
- **Success:** Users understand AI is interpretative only, no legal power

**Risk 5: Users perceive runtime indicators as voting/support**
- **Test:** Do users interpret comment counts or participant counts as votes or support?
- **Success:** Users understand indicators are analytics only, not voting signals

**Risk 6: Users perceive objections as procedural blocks**
- **Test:** Do users believe objections prevent or block actions?
- **Success:** Users understand objections are semantic markers only, no procedural power

### Success Criteria (Interpretation-Based)

**Success means:**
- ✅ Users explicitly state ideas are "discussion only" or "not binding"
- ✅ Users do not use approval language ("approved", "adopted", "decided")
- ✅ Users understand DRAFT resolution means draft only
- ✅ Users treat AI content as advisory, not authoritative
- ✅ Users do not interpret indicators as votes or support
- ✅ Users understand objections are markers, not blocks

**Failure means:**
- ❌ Users believe ideas create decisions or approvals
- ❌ Users use approval language when describing actions
- ❌ Users treat DRAFT resolution as approved
- ❌ Users treat AI content as facts or recommendations
- ❌ Users interpret indicators as voting or support signals
- ❌ Users believe objections have procedural power

---

## 2. Test Setup

### Pilot Community Selection

**Criteria:**
- 2-3 real communities (not test accounts)
- Communities with active membership (5-10 members minimum)
- Mix of community types (if applicable)
- Communities willing to participate in 7-day pilot
- Communities that have not used governance features extensively (to avoid bias)

**Exclusion criteria:**
- Communities that have been involved in module design
- Communities with members who are developers or designers
- Communities that have received detailed explanations of the module

### What NOT to Explain (To Avoid Bias)

**DO NOT explain:**
- ❌ That the module is "PRE-GOVERNANCE" (use neutral language)
- ❌ That ideas have "no legal power" (let users discover this)
- ❌ That phases are "labels only" (observe if users assume procedural meaning)
- ❌ That AI is "interpretative only" (observe if users treat it as authoritative)
- ❌ That indicators are "analytics only" (observe if users interpret as votes)
- ❌ That objections are "semantic markers" (observe if users treat as blocks)

**DO explain (minimal onboarding):**
- ✅ How to create an idea
- ✅ How to add comments
- ✅ How to change phase
- ✅ How to view AI summaries
- ✅ How to create draft resolution
- ✅ Basic navigation

**Onboarding script (neutral):**
```
"This is the Ideas / Planning module. You can create ideas, discuss them with comments, 
and if you want, create a draft resolution from an idea. Let's walk through the basics."
```

### Environment

**Type:** Staging environment (production-like)  
**Data:** Real community data (orgs, memberships)  
**Isolation:** Pilot communities only, no other users  
**Duration:** 7 days continuous access  
**Support:** Minimal support (answer technical questions only, not explain module purpose)

---

## 3. Test Scenarios (Step-by-Step)

### Scenario A: Creating a New Idea

**Steps:**
1. Participant logs in as ACTIVE MEMBER
2. Navigate to Ideas / Planning module
3. Click "Create Idea" button
4. Fill in:
   - Title: "Community Garden Project"
   - Content: "Proposal to create a community garden in the neighborhood"
   - Metadata: Leave empty or add `fact.location: "Park area"`
5. Submit idea
6. View created idea

**Observation points:**
- Does user ask "Is this approved now?" or "Is this a decision?"
- Does user look for approval indicators or success messages?
- Does user understand idea is in "draft" phase?
- What language does user use to describe what they just did?

**Expected behavior:**
- User creates idea without asking about approval
- User understands idea is created but not approved
- User uses neutral language ("created idea", not "approved idea")

---

### Scenario B: Discussion with Comments and Objections

**Steps:**
1. Participant (OWNER) views idea from Scenario A
2. Add a regular comment: "I think this is a good idea, but we need to consider maintenance costs."
3. Another participant (ACTIVE MEMBER) adds an objection:
   - Content: "I object to this proposal"
   - Check "Mark as objection"
   - Add metadata: `fact.objection.reason: "Concerns about long-term funding"`
4. View idea with comments and objections
5. Discuss the objection in follow-up comments

**Observation points:**
- Does user believe objection blocks or prevents something?
- Does user ask "Can we still proceed with objections?"
- Does user treat objection count as "votes against"?
- Does user understand objections are discussion markers only?

**Expected behavior:**
- Users discuss objections as discussion points
- Users do not believe objections block actions
- Users do not interpret objection count as voting

---

### Scenario C: Phase Transition to ready_for_vote

**Steps:**
1. Participant (OWNER) views idea with comments
2. Change phase from "discussion" to "refined"
3. Add more comments discussing refinements
4. Change phase from "refined" to "ready_for_vote"
5. View idea in "ready_for_vote" phase

**Observation points:**
- Does user believe phase change means approval?
- Does user ask "Is this approved now?" when changing to "ready_for_vote"?
- Does user interpret "ready_for_vote" as "ready for approval"?
- Does user look for success indicators or green colors?
- What language does user use to describe the phase change?

**Expected behavior:**
- User understands phase is a label change only
- User does not interpret "ready_for_vote" as approval readiness
- User uses neutral language ("changed phase", not "approved")

---

### Scenario D: Viewing Runtime Indicators

**Steps:**
1. Participant views idea with multiple comments
2. Observe "Discussion Activity" indicator (comment count)
3. Observe "Discussion Participants" indicator (participant count)
4. Observe "Objection Markers" indicator (objection count)
5. Observe "Last Activity" timestamp
6. Try to sort or filter ideas (if UI allows)

**Observation points:**
- Does user interpret comment count as "votes" or "support"?
- Does user interpret participant count as "supporters" or "endorsers"?
- Does user interpret objection count as "votes against"?
- Does user try to sort by "most popular" or "most supported"?
- Does user ask "Which idea has the most support?"

**Expected behavior:**
- Users understand indicators are activity metrics only
- Users do not interpret indicators as voting or support
- Users do not use voting language when discussing indicators

---

### Scenario E: Using AI Summaries

**Steps:**
1. Participant views idea with content and comments
2. Expand "AI-Generated Summary" section
3. Read AI summary
4. Expand "AI-Generated Risks" section
5. Read AI risk assessment
6. Expand "AI-Generated Suggestions" section
7. Read AI suggestions
8. Try to copy AI content (if allowed)

**Observation points:**
- Does user treat AI summary as fact or authoritative?
- Does user ask "Is this accurate?" or "Can I trust this?"
- Does user try to use AI content directly in resolution text?
- Does user believe AI risks mean the idea should be rejected?
- Does user treat AI suggestions as requirements?
- Does user notice disclaimers about AI being "interpretative only"?

**Expected behavior:**
- Users understand AI is advisory only
- Users read disclaimers and understand no legal power
- Users do not treat AI content as authoritative
- Users do not auto-apply AI suggestions

---

### Scenario F: Promoting Idea to DRAFT Resolution

**Steps:**
1. Participant (OWNER) views idea in "ready_for_vote" phase
2. Click "Create Draft Resolution" button
3. Read confirmation modal:
   - Title: "Create Draft Resolution"
   - Body text explaining DRAFT only, no approval
   - Checkbox: "I understand this creates a DRAFT resolution only..."
4. Check the confirmation checkbox
5. Click "Create Draft Resolution" button
6. View post-action message
7. Navigate to Governance module
8. View created DRAFT resolution

**Observation points:**
- Does user ask "Is this approved now?" after clicking button?
- Does user read the confirmation modal carefully?
- Does user understand DRAFT means draft only?
- Does user look for success indicators or green colors?
- Does user believe resolution is approved or adopted?
- What language does user use to describe what happened?
- Does user understand they need to take further action in Governance?

**Expected behavior:**
- User reads confirmation modal and understands DRAFT only
- User does not interpret action as approval
- User understands further governance action is required
- User uses neutral language ("created draft", not "approved")

---

### Scenario G: Viewing Created DRAFT in Governance

**Steps:**
1. Participant navigates to Governance module
2. Find the DRAFT resolution created from idea
3. View resolution detail
4. Check resolution metadata (if visible)
5. Observe resolution status: "DRAFT"
6. Try to understand what actions are available

**Observation points:**
- Does user understand resolution is in DRAFT status?
- Does user ask "Why isn't this approved?" or "What do I do now?"
- Does user understand DRAFT means no legal power yet?
- Does user look for link back to original idea?
- Does user understand they need to take governance actions separately?

**Expected behavior:**
- User understands resolution is DRAFT only
- User understands further governance actions are required
- User does not believe resolution is approved or binding

---

## 4. Observation Checklist (Critical)

### Language Observation

**Questions to observe:**
- [ ] Do users use approval language? ("approved", "adopted", "decided")
- [ ] Do users use voting language? ("votes", "supporters", "endorsers")
- [ ] Do users use success language? ("success", "complete", "finished")
- [ ] Do users use neutral language? ("created", "discussion", "draft")

**Red flags:**
- ❌ "I approved the idea"
- ❌ "The idea got 5 votes"
- ❌ "This idea is supported by 3 people"
- ❌ "The resolution was approved"

**Good signs:**
- ✅ "I created an idea"
- ✅ "There are 5 comments on this idea"
- ✅ "3 people have commented"
- ✅ "I created a draft resolution"

---

### Visual Interpretation

**Questions to observe:**
- [ ] Do users look for green/success colors and interpret as approval?
- [ ] Do users look for checkmarks and interpret as approval?
- [ ] Do users notice warning/neutral colors and understand caution?
- [ ] Do users interpret phase colors as status indicators?

**Red flags:**
- ❌ "Why isn't this green? Does that mean it's not approved?"
- ❌ "I see a checkmark, so this is approved, right?"
- ❌ "The yellow color means it's ready, doesn't it?"

**Good signs:**
- ✅ Users understand colors are informational only
- ✅ Users do not associate colors with approval/status
- ✅ Users notice disclaimers and warnings

---

### Procedural Understanding

**Questions to observe:**
- [ ] Do users believe ideas create decisions?
- [ ] Do users believe phase changes mean approval?
- [ ] Do users believe DRAFT resolution means approved?
- [ ] Do users understand further governance action is required?

**Red flags:**
- ❌ "So this idea is now a decision?"
- ❌ "Changing to ready_for_vote means it's approved?"
- ❌ "The resolution is approved now, right?"
- ❌ "What do you mean I need to do something else?"

**Good signs:**
- ✅ "This is just discussion, right?"
- ✅ "So this creates a draft, but it's not approved yet?"
- ✅ "I need to do something in Governance to make this official?"

---

### AI Interpretation

**Questions to observe:**
- [ ] Do users treat AI content as authoritative?
- [ ] Do users ask if AI content is accurate or trustworthy?
- [ ] Do users try to use AI content directly in resolutions?
- [ ] Do users notice and understand AI disclaimers?

**Red flags:**
- ❌ "Is this AI summary accurate?"
- ❌ "Can I trust this AI assessment?"
- ❌ "I'll just copy this AI summary into the resolution"
- ❌ "The AI says there are risks, so we should reject this"

**Good signs:**
- ✅ "This is just AI's interpretation, right?"
- ✅ "I'll use this as a starting point for my own text"
- ✅ "I see the disclaimer that this has no legal power"

---

### Indicator Interpretation

**Questions to observe:**
- [ ] Do users interpret comment counts as votes?
- [ ] Do users interpret participant counts as supporters?
- [ ] Do users interpret objection counts as votes against?
- [ ] Do users try to sort by "popularity" or "support"?

**Red flags:**
- ❌ "This idea has 5 votes"
- ❌ "3 people support this idea"
- ❌ "2 people voted against this"
- ❌ "Which idea is most popular?"

**Good signs:**
- ✅ "This idea has 5 comments"
- ✅ "3 people have commented on this"
- ✅ "There are 2 objections marked"
- ✅ "Which idea has the most discussion?"

---

### Objection Understanding

**Questions to observe:**
- [ ] Do users believe objections block or prevent actions?
- [ ] Do users ask if they can proceed with objections?
- [ ] Do users treat objections as procedural blocks?

**Red flags:**
- ❌ "There are objections, so we can't proceed"
- ❌ "Do objections block the idea?"
- ❌ "Can we still create a resolution with objections?"

**Good signs:**
- ✅ "These objections are just discussion points"
- ✅ "Objections don't prevent anything, right?"
- ✅ "We can still create a draft resolution"

---

## 5. Data Collection Methods

### Direct Observation
- **Method:** Screen sharing sessions (recorded with permission)
- **Duration:** 30-60 minutes per participant
- **Focus:** Observe language, visual interpretation, procedural understanding
- **Notes:** Record exact quotes and behaviors

### Surveys (Post-Scenario)
- **Timing:** After each major scenario
- **Questions:**
  1. "In your own words, what did you just do?"
  2. "Does this action create a decision or approval? Why or why not?"
  3. "What do you think happens next?"
  4. "What does 'DRAFT' mean to you?"

### Interviews (Post-Pilot)
- **Timing:** After 7-day pilot period
- **Duration:** 30-45 minutes
- **Questions:**
  1. "What is the purpose of the Ideas / Planning module?"
  2. "Do ideas create decisions or approvals? Explain."
  3. "What does it mean when an idea is 'ready_for_vote'?"
  4. "What happens when you create a draft resolution?"
  5. "How do you interpret AI summaries and suggestions?"
  6. "What do comment counts and participant counts mean to you?"

### Usage Analytics
- **Track:** Button clicks, phase changes, AI section expansions
- **Focus:** Do users read confirmation modals? Do they expand AI sections?
- **Metrics:** Time spent reading disclaimers, modal interaction patterns

---

## 6. Success/Failure Thresholds

### Critical Failure (Must Fix)
- **>30% of users** believe ideas create decisions
- **>30% of users** use approval language
- **>30% of users** believe DRAFT resolution means approved
- **>30% of users** treat AI content as authoritative

### Warning Signs (Review Required)
- **20-30% of users** misinterpret module purpose
- **20-30% of users** use approval language
- **20-30% of users** do not read disclaimers

### Success Criteria
- **<20% of users** misinterpret module purpose
- **<20% of users** use approval language
- **>80% of users** understand DRAFT means draft only
- **>80% of users** understand AI is interpretative only
- **>80% of users** understand indicators are analytics only

---

## 7. Pilot Timeline

### Day 1: Setup and Onboarding
- Deploy staging environment
- Onboard pilot communities (minimal explanation)
- Provide basic navigation guide
- Start observation

### Days 2-3: Core Scenarios
- Scenarios A, B, C (Create, Discuss, Phase Change)
- Direct observation sessions
- Post-scenario surveys
- Daily check-ins

### Days 4-5: Advanced Scenarios
- Scenarios D, E (Indicators, AI)
- Direct observation sessions
- Post-scenario surveys
- Monitor usage patterns

### Days 6-7: Resolution Scenarios
- Scenarios F, G (Promote to DRAFT, View in Governance)
- Direct observation sessions
- Post-scenario surveys
- Final usage analytics review

### Post-Pilot (Day 8+): Analysis
- Conduct post-pilot interviews
- Analyze observation notes
- Review survey responses
- Compile findings report

---

## 8. Reporting Template

### Pilot Findings Report

**Executive Summary:**
- Number of participants
- Overall interpretation accuracy
- Critical failures (if any)
- Key findings

**Interpretation Analysis:**
- Language usage patterns
- Visual interpretation patterns
- Procedural understanding
- AI interpretation
- Indicator interpretation

**Recommendations:**
- UI/UX changes needed
- Language changes needed
- Additional disclaimers needed
- Training materials needed (if any)

**Risk Assessment:**
- Remaining risks
- Mitigation strategies
- Go/No-Go decision for production

---

## 9. Ethical Considerations

### Informed Consent
- Participants must understand this is a pilot test
- Participants must consent to observation and recording
- Participants must understand their data will be used for analysis
- Participants must have the right to withdraw

### Data Privacy
- All recordings must be securely stored
- Personal information must be anonymized in reports
- Data must be deleted after analysis (unless consent for retention)

### Bias Prevention
- Observers must not lead participants
- Observers must not explain module purpose
- Observers must record observations neutrally
- Analysis must be objective

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0  
**Pilot Status:** [Draft / Ready / In Progress / Complete]
