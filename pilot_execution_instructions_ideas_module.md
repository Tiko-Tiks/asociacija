# Pilot Execution Instructions - Ideas / Planning Module

**Module:** Ideas / Planning (PRE-GOVERNANCE)  
**Purpose:** Operational instructions for observers and moderators  
**Tone:** Strict, governance-first, observation-focused

---

## 1. Pilot Roles and Responsibilities

### Observer

**MUST:**
- Record user statements verbatim
- Note visual interpretation patterns
- Document language usage (approval vs. neutral)
- Tag observations with categories (confusion, false certainty, hesitation)
- Maintain observation log throughout pilot
- Report red flags immediately

**MUST NOT:**
- Explain module purpose or functionality
- Answer questions about "what this means" or "how this works"
- Correct user misunderstandings
- Justify system behavior
- Suggest how to use features
- Provide training or guidance

**Boundary:** Observer is a recorder, not a teacher or facilitator.

---

### Moderator (If Applicable)

**MUST:**
- Provide minimal technical support (login issues, broken links)
- Answer questions about basic navigation only
- Escalate red flags to pilot coordinator
- Ensure pilot environment remains stable

**MUST NOT:**
- Explain module purpose
- Interpret UI elements for users
- Answer "what does this mean?" questions
- Provide feature explanations
- Make UI changes during pilot

**Boundary:** Moderator handles technical issues only, not interpretation.

---

### Participants

**MUST:**
- Use the module as they would in production
- Ask questions if confused (observers will note but not answer)
- Complete assigned scenarios
- Provide honest feedback in surveys/interviews

**MUST NOT:**
- Receive training beyond basic navigation
- Receive explanations of module purpose
- Be corrected if they misunderstand
- Be guided on "correct" usage

**Boundary:** Participants are test subjects, not trainees.

---

## 2. Before the Pilot Starts

### Environment Checklist

**Technical Setup:**
- [ ] Staging environment deployed and accessible
- [ ] Pilot communities created with real org structure
- [ ] Test users created with correct roles (OWNER, ACTIVE, PENDING)
- [ ] Ideas module accessible to pilot communities
- [ ] Governance module accessible (for Scenario G)
- [ ] All RPC functions operational
- [ ] RLS policies active
- [ ] Metadata validation triggers active
- [ ] Snapshot immutability triggers active

**Data Setup:**
- [ ] No pre-existing ideas in pilot communities
- [ ] No pre-configured metadata
- [ ] No pre-filled AI content
- [ ] Clean slate for each pilot community

**Access Setup:**
- [ ] Participants have login credentials
- [ ] Screen sharing software configured (if remote observation)
- [ ] Recording software configured (with consent)
- [ ] Observation log template prepared

### What Must Be Reset / Verified

**Before Each Pilot Community:**
- [ ] All ideas deleted (if not first community)
- [ ] All comments deleted (if not first community)
- [ ] All draft resolutions deleted (if not first community)
- [ ] User preferences reset (collapsed AI sections, etc.)
- [ ] No cached data or session state

**Verification:**
- [ ] Test login as each participant role
- [ ] Verify RLS policies work correctly
- [ ] Verify RPC functions work correctly
- [ ] Verify UI displays correctly (no broken elements)

### What Must NOT Be Preconfigured or Explained

**FORBIDDEN Preconfiguration:**
- ❌ Pre-created ideas with example content
- ❌ Pre-filled metadata
- ❌ Pre-generated AI content
- ❌ Pre-set phase values
- ❌ Pre-created comments or objections
- ❌ Pre-created draft resolutions

**FORBIDDEN Explanations:**
- ❌ Module purpose or philosophy
- ❌ PRE-GOVERNANCE concept
- ❌ "No legal power" disclaimers (unless visible in UI)
- ❌ Phase meanings or transitions
- ❌ AI interpretation guidelines
- ❌ Indicator meanings
- ❌ Objection semantics

**Allowed:**
- ✅ Basic navigation: "Click here to create an idea"
- ✅ Technical help: "The button isn't working? Let me check the link"
- ✅ Login assistance: "Your password is X"

---

## 3. During the Pilot (Core)

### How to Introduce the Module

**Exact Wording (Neutral):**
```
"This is the Ideas / Planning module. You can create ideas, discuss them with 
comments, and if you want, create a draft resolution from an idea. Let's walk 
through the basics of navigation."
```

**Strict Guidelines:**
- Use neutral, descriptive language only
- Do not explain purpose or philosophy
- Do not mention "PRE-GOVERNANCE" or "no legal power"
- Do not explain what ideas "mean" or "do"
- Focus on "how to navigate" not "what this means"

**FORBIDDEN Introductions:**
- ❌ "This module is for discussion only"
- ❌ "Ideas have no legal power"
- ❌ "This is PRE-GOVERNANCE"
- ❌ "Ideas don't create decisions"
- ❌ "This is just for planning"

### How to Answer User Questions

#### Allowed Answers (Technical Only)

**Navigation Questions:**
- ✅ "Click the 'Create Idea' button to create a new idea"
- ✅ "The comments section is below the idea content"
- ✅ "Click 'Expand' to see the AI summary"

**Technical Issues:**
- ✅ "The button isn't working? Let me check the link"
- ✅ "You're getting an error? Let me verify your permissions"
- ✅ "The page isn't loading? Try refreshing"

**Feature Location:**
- ✅ "The phase selector is in the top right of the idea detail view"
- ✅ "The 'Create Draft Resolution' button appears when phase is 'ready_for_vote'"

#### Forbidden Answers (Interpretation)

**FORBIDDEN:**
- ❌ "Ideas are for discussion only"
- ❌ "This doesn't create a decision"
- ❌ "DRAFT means it's not approved"
- ❌ "AI is interpretative only"
- ❌ "Comments aren't votes"
- ❌ "Objections don't block anything"
- ❌ "This has no legal power"
- ❌ "You need to do something else in Governance"

**Response Protocol for Interpretation Questions:**
1. Note the question verbatim in observation log
2. Tag as "interpretation question"
3. Respond: "I can help with navigation, but I'm observing how the system works for you. What do you think it means?"
4. Do NOT provide the "correct" interpretation

### How to Observe Without Influencing Behavior

**Observation Discipline:**
- Sit/stand where you can see screen but not be seen (if possible)
- Remain silent unless asked a technical question
- Do not nod, shake head, or provide non-verbal feedback
- Do not react to user actions (positive or negative)
- Do not provide encouragement or discouragement

**Recording:**
- Record statements verbatim (use quotes)
- Note exact UI elements user interacts with
- Note time spent reading disclaimers
- Note whether user expands AI sections
- Note language used to describe actions

**Influence Prevention:**
- Do not guide user to "try" certain features
- Do not suggest "maybe you should..."
- Do not correct user if they misunderstand
- Do not explain why something works a certain way

### When to Intervene (And When NOT To)

#### Intervene (Technical Issues Only)

**Intervene when:**
- System error prevents user from proceeding
- Button/link is broken or non-functional
- User cannot log in or access module
- Data corruption or display error occurs
- User asks for technical help (navigation, broken feature)

**Intervention protocol:**
1. Acknowledge issue: "I see the button isn't working"
2. Fix technical issue only
3. Do not explain why it happened or what it means
4. Resume observation

#### Do NOT Intervene (Interpretation Issues)

**Do NOT intervene when:**
- User misunderstands module purpose
- User uses approval language incorrectly
- User interprets phases as status
- User treats AI as authoritative
- User interprets indicators as votes
- User believes objections block actions
- User thinks DRAFT means approved

**Non-intervention protocol:**
1. Note the misinterpretation verbatim
2. Tag as "red flag" or "misinterpretation"
3. Continue observation
4. Do NOT correct or explain

---

## 4. Observation Protocol

### How to Record User Statements Verbatim

**Format:**
```
[Timestamp] [User Role] [Scenario]
"[Exact quote from user]"
[Context: What user was doing]
[Tag: confusion / false certainty / hesitation / correct understanding]
```

**Example:**
```
[2024-01-15 14:32] [OWNER] [Scenario F]
"So when I click this, the idea is approved, right?"
[Context: User viewing "Create Draft Resolution" button]
[Tag: false certainty - believes promotion = approval]
```

**Rules:**
- Record exact words, not paraphrased
- Include filler words ("um", "uh", "like")
- Note tone (uncertain, confident, confused)
- Note non-verbal cues (if visible)

### How to Tag Observations

**Tag Categories:**

**confusion:**
- User explicitly states they don't understand
- User asks "what does this mean?"
- User hesitates before action
- User reads disclaimers multiple times

**false certainty:**
- User states incorrect interpretation with confidence
- User uses approval language ("approved", "adopted")
- User believes action created decision
- User treats AI as authoritative

**hesitation:**
- User pauses before action
- User re-reads text multiple times
- User asks "should I...?" or "is this...?"
- User looks for confirmation before proceeding

**correct understanding:**
- User explicitly states "discussion only" or "not binding"
- User understands DRAFT means draft only
- User treats AI as advisory
- User uses neutral language

**red flag:**
- User believes decision was made
- User believes voting occurred
- User believes project became active
- User believes AI decided something

### How to Handle Conflicting Interpretations

**Within Same User:**
- Record both interpretations
- Note context for each (what user was doing)
- Tag both observations
- Do not resolve conflict - note the contradiction

**Between Users:**
- Record each user's interpretation separately
- Do not compare or contrast during pilot
- Note both in observation log
- Analysis happens post-pilot, not during

**Observer Disagreement:**
- If multiple observers, each records independently
- Do not discuss interpretations during pilot
- Compare notes post-pilot only
- Majority interpretation does not override minority

---

## 5. Red Flag Handling

### What to Do If Users Believe a Decision Was Made

**Red Flag Indicators:**
- User states: "The idea is now a decision"
- User states: "This is approved"
- User states: "We decided to..."
- User looks for decision confirmation

**Protocol:**
1. Record statement verbatim
2. Tag as "RED FLAG - decision belief"
3. Note what action user took (create idea, change phase, promote)
4. Continue observation (do NOT correct)
5. Report to pilot coordinator immediately
6. Note in daily log

**Do NOT:**
- Correct user
- Explain that no decision was made
- Justify system behavior
- Stop pilot (unless coordinator decides)

### What to Do If Users Believe Voting Occurred

**Red Flag Indicators:**
- User states: "5 people voted"
- User states: "This has 3 votes"
- User interprets comment count as votes
- User interprets participant count as supporters

**Protocol:**
1. Record statement verbatim
2. Tag as "RED FLAG - voting belief"
3. Note which indicator user misinterpreted
4. Continue observation (do NOT correct)
5. Report to pilot coordinator
6. Note in daily log

### What to Do If Users Believe Project Became Active

**Red Flag Indicators:**
- User states: "The project is now active"
- User looks for project in Projects module
- User believes promotion created active project
- User asks "where is the project?"

**Protocol:**
1. Record statement verbatim
2. Tag as "RED FLAG - project activation belief"
3. Note what action led to belief
4. Continue observation (do NOT correct)
5. Report to pilot coordinator
6. Note in daily log

### What to Do If Users Believe AI Decided Something

**Red Flag Indicators:**
- User states: "The AI says we should..."
- User treats AI as authoritative
- User copies AI content directly to resolution
- User asks "Is the AI correct?"

**Protocol:**
1. Record statement verbatim
2. Tag as "RED FLAG - AI authority belief"
3. Note which AI content user treated as authoritative
4. Continue observation (do NOT correct)
5. Report to pilot coordinator
6. Note in daily log

### When to STOP the Pilot for a Community

**Stop Conditions:**
- **Critical:** >50% of users in community believe decisions are made
- **Critical:** >50% of users use approval language consistently
- **Critical:** Community-wide misunderstanding that cannot be corrected without bias
- **Technical:** System failure that cannot be fixed quickly
- **Ethical:** Participant requests to stop or withdraws consent

**Stop Protocol:**
1. Immediately pause all observation
2. Do NOT explain why stopping
3. Do NOT correct misunderstandings
4. Report to pilot coordinator
5. Document reason for stop
6. Preserve all observation data collected

**Do NOT Stop For:**
- Individual user misunderstandings (unless critical)
- UI confusion (unless system-breaking)
- User frustration (unless ethical issue)
- Minor technical issues

---

## 6. Daily Pilot Rhythm (7 Days)

### Day 1: Setup and Onboarding

**Morning:**
- [ ] Verify environment checklist complete
- [ ] Reset all data (if not first community)
- [ ] Test login for all participant roles
- [ ] Verify all features operational

**Afternoon:**
- [ ] Onboard pilot community (neutral introduction only)
- [ ] Provide basic navigation guide
- [ ] Start observation
- [ ] Begin observation log

**End of Day:**
- [ ] Review observation log
- [ ] Note any red flags
- [ ] Prepare for Day 2 scenarios

### Days 2-3: Core Scenarios

**Daily Checklist:**
- [ ] Review previous day's observations
- [ ] Note any patterns or trends
- [ ] Prepare for scheduled scenarios
- [ ] Verify no data corruption
- [ ] Check for technical issues

**During Scenarios:**
- [ ] Record all user statements verbatim
- [ ] Tag observations appropriately
- [ ] Note red flags immediately
- [ ] Complete post-scenario surveys

**End of Day:**
- [ ] Compile daily observation summary
- [ ] Note red flags for coordinator
- [ ] Review survey responses
- [ ] Prepare next day's scenarios

**What NOT to Adjust:**
- ❌ Do NOT fix UI based on user confusion
- ❌ Do NOT add explanations or tooltips
- ❌ Do NOT change language or labels
- ❌ Do NOT modify disclaimers
- ❌ Do NOT adjust colors or visual treatment

### Days 4-5: Advanced Scenarios

**Daily Checklist:**
- [ ] Continue observation discipline
- [ ] Monitor for red flag patterns
- [ ] Note if users are "learning" correct interpretation (or incorrect)
- [ ] Verify no observer drift (observers changing behavior)

**Focus Areas:**
- AI interpretation patterns
- Indicator interpretation patterns
- Objection understanding
- Phase transition understanding

**End of Day:**
- [ ] Daily summary with patterns
- [ ] Red flag escalation if needed
- [ ] Prepare for resolution scenarios

### Days 6-7: Resolution Scenarios

**Daily Checklist:**
- [ ] Final observation discipline
- [ ] Monitor promotion to DRAFT understanding
- [ ] Note Governance module navigation
- [ ] Prepare for post-pilot interviews

**Focus Areas:**
- DRAFT resolution understanding
- Post-promotion behavior
- Governance module navigation
- Final interpretation patterns

**End of Day:**
- [ ] Final daily summary
- [ ] Compile all red flags
- [ ] Prepare post-pilot interview questions
- [ ] Schedule post-pilot interviews

### How to Log Daily Findings

**Daily Log Template:**
```
Date: [Date]
Pilot Community: [Name]
Scenarios Completed: [List]
Participants Observed: [Count]

Red Flags:
- [List with timestamps]

Patterns Observed:
- [Language patterns, interpretation patterns]

Notable Quotes:
- "[Quote 1]" - [Context] - [Tag]
- "[Quote 2]" - [Context] - [Tag]

Technical Issues:
- [List any technical problems]

Observer Notes:
- [Any observer observations or concerns]
```

**Rules:**
- Log immediately after each scenario
- Do NOT interpret or analyze (save for post-pilot)
- Record facts only, not opinions
- Use exact quotes, not paraphrases

---

## 7. Pilot Close-Out

### How to Debrief Participants

**Timing:** After all scenarios complete, before post-pilot interview

**Debrief Script (Neutral):**
```
"Thank you for participating in the pilot. We've observed how you used the 
Ideas / Planning module over the past 7 days. 

Before we ask some follow-up questions, we want to make sure you understand 
that this was a test of the system, not a test of you. There are no right 
or wrong answers.

We'll ask you some questions about your experience and what you understood 
about the module. Please answer honestly based on what you actually thought 
and experienced."
```

**Do NOT:**
- ❌ Explain what the module "should" mean
- ❌ Correct any misunderstandings
- ❌ Provide "correct" interpretations
- ❌ Justify system behavior
- ❌ Apologize for confusion

### What Questions to Ask AFTER Pilot (Post-Mortem Only)

**Post-Pilot Interview Questions:**

1. **Purpose Understanding:**
   - "In your own words, what is the purpose of the Ideas / Planning module?"
   - "What do you think ideas are for?"

2. **Decision Understanding:**
   - "Do ideas create decisions or approvals? Explain."
   - "What happens when you create an idea?"
   - "What happens when you change an idea's phase?"

3. **Resolution Understanding:**
   - "What does it mean when you create a draft resolution?"
   - "Is a draft resolution approved? Explain."
   - "What do you think needs to happen next?"

4. **AI Understanding:**
   - "How do you interpret AI summaries and suggestions?"
   - "Do you treat AI content as authoritative or advisory?"
   - "Did you notice any disclaimers about AI content?"

5. **Indicator Understanding:**
   - "What do comment counts mean to you?"
   - "What do participant counts mean to you?"
   - "What do objection counts mean to you?"

6. **Overall Experience:**
   - "What was confusing about the module?"
   - "What was clear about the module?"
   - "What would you change?"

**Question Protocol:**
- Ask open-ended questions
- Do NOT lead with "correct" answers
- Do NOT correct responses
- Record answers verbatim
- Note hesitation or uncertainty

### How to Compile Findings Without Interpretation Bias

**Compilation Rules:**
- Use exact quotes, not paraphrases
- Include all observations, not just "interesting" ones
- Note frequency of patterns, not just presence
- Separate facts from observer interpretations
- Tag all findings with categories

**Compilation Structure:**

1. **Raw Data:**
   - All user statements (verbatim)
   - All observation notes
   - All survey responses
   - All interview transcripts

2. **Categorized Findings:**
   - Language usage patterns
   - Visual interpretation patterns
   - Procedural understanding patterns
   - AI interpretation patterns
   - Indicator interpretation patterns

3. **Quantitative Analysis:**
   - Percentage using approval language
   - Percentage believing decisions made
   - Percentage treating AI as authoritative
   - Percentage understanding DRAFT correctly

4. **Red Flag Summary:**
   - All red flags with context
   - Frequency of each red flag type
   - Severity assessment

5. **Recommendations (Post-Analysis Only):**
   - UI/UX changes needed
   - Language changes needed
   - Additional disclaimers needed
   - Training materials needed (if any)

**Bias Prevention:**
- Do NOT interpret during compilation
- Do NOT filter "unimportant" observations
- Do NOT prioritize certain findings
- Do NOT add observer opinions
- Present data objectively

---

## 8. Observer Code of Conduct

### Core Principles

1. **Observation, Not Facilitation:**
   - You are a recorder, not a teacher
   - You document behavior, not correct it
   - You note interpretations, not guide them

2. **Neutrality:**
   - No leading questions
   - No non-verbal feedback
   - No interpretation during pilot
   - No justification of system

3. **Discipline:**
   - Follow protocols strictly
   - Record verbatim, not paraphrased
   - Tag consistently
   - Report red flags immediately

4. **Governance-First:**
   - Legal safety over user convenience
   - Correct interpretation over user satisfaction
   - System integrity over user experience
   - No shortcuts or workarounds

### Violations

**Observer violations include:**
- Explaining module purpose or functionality
- Correcting user misunderstandings
- Providing interpretation guidance
- Justifying system behavior
- Making UI changes during pilot
- Filtering observations based on bias
- Interpreting findings during pilot

**Consequences:**
- Immediate removal from pilot
- Data from that observer may be excluded
- Pilot may need to restart if critical violation

---

## 9. Emergency Protocols

### System Failure

**If system fails:**
1. Stop all observation immediately
2. Do NOT explain failure to users
3. Report to technical team
4. Document what was observed before failure
5. Wait for fix before resuming

### Participant Distress

**If participant is distressed:**
1. Stop observation immediately
2. Offer to pause or stop pilot
3. Do NOT explain or justify
4. Report to pilot coordinator
5. Preserve all data collected

### Data Loss

**If observation data is lost:**
1. Document what was lost
2. Do NOT re-interview to recreate data
3. Note gap in findings report
4. Continue with remaining data
5. Report to pilot coordinator

---

## 10. Final Checklist

### Pre-Pilot
- [ ] Environment deployed and tested
- [ ] All data reset
- [ ] Participants onboarded (neutral only)
- [ ] Observers briefed on protocols
- [ ] Observation logs prepared

### During Pilot
- [ ] Observation discipline maintained
- [ ] All statements recorded verbatim
- [ ] Red flags reported immediately
- [ ] No teaching or correcting
- [ ] Daily logs completed

### Post-Pilot
- [ ] All data compiled
- [ ] Findings report prepared
- [ ] Red flags documented
- [ ] Recommendations prepared (post-analysis)
- [ ] Participants debriefed

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0  
**Document Status:** [Draft / Approved / Active]
