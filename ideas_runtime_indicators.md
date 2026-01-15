# Ideas / Planning Module - Runtime Indicators

**Status:** PRE-GOVERNANCE  
**Purpose:** Analytics-only indicators. No voting, approval, or decision semantics.

---

## Canonical Indicator Names

### 1. Discussion Activity Count
**Internal Name:** `comment_count`  
**Human-Readable Label:** `Discussion Activity`  
**Description:** Total number of comments on this idea.

### 2. Objection Markers Count
**Internal Name:** `objections_count`  
**Human-Readable Label:** `Objection Markers`  
**Description:** Number of comments marked as objections.

### 3. Last Activity Timestamp
**Internal Name:** `last_activity`  
**Human-Readable Label:** `Last Activity`  
**Description:** Most recent comment or edit timestamp.

### 4. Participant Count
**Internal Name:** `participant_count`  
**Human-Readable Label:** `Discussion Participants`  
**Description:** Number of unique users who have commented.

### 5. Discussion Duration
**Internal Name:** `discussion_duration`  
**Human-Readable Label:** `Discussion Duration`  
**Description:** Time elapsed since idea creation.

---

## Mandatory Tooltip Text

### Discussion Activity
```
Total number of comments on this idea. This is an analytics metric only. 
Comments are discussion and have no voting, approval, or decision-making semantics.
```

### Objection Markers
```
Number of comments marked as objections. Objections are semantic markers only 
and have no procedural power. This count does not indicate approval, rejection, 
or any decision outcome.
```

### Last Activity
```
Most recent comment or edit timestamp. This indicates discussion activity only, 
not approval status, popularity, or decision readiness.
```

### Discussion Participants
```
Number of unique users who have commented on this idea. This is an analytics 
metric only. Participant count does not indicate support, approval, or 
quorum requirements.
```

### Discussion Duration
```
Time elapsed since idea creation. This is an informational metric only. 
Duration does not indicate priority, urgency, or decision readiness.
```

---

## Forbidden UI Usages

### Sorting
- ❌ **FORBIDDEN:** Sort ideas by `comment_count` (labeled as "Most Popular", "Most Discussed", "Most Active")
- ❌ **FORBIDDEN:** Sort ideas by `objections_count` (labeled as "Most Objected", "Most Controversial")
- ❌ **FORBIDDEN:** Sort ideas by `participant_count` (labeled as "Most Supported", "Most Engaged")
- ❌ **FORBIDDEN:** Sort ideas by `last_activity` (labeled as "Most Recent Activity" implying priority)
- ❌ **FORBIDDEN:** Any sorting that implies popularity, priority, or decision readiness

### Highlighting
- ❌ **FORBIDDEN:** Highlight ideas with high `comment_count` as "Popular" or "Trending"
- ❌ **FORBIDDEN:** Highlight ideas with high `participant_count` as "Well-Supported" or "Endorsed"
- ❌ **FORBIDDEN:** Highlight ideas with low `objections_count` as "Approved" or "Accepted"
- ❌ **FORBIDDEN:** Use indicator values to change phase automatically
- ❌ **FORBIDDEN:** Display indicators with success colors (green) implying approval

### Badges and Labels
- ❌ **FORBIDDEN:** Badge showing "X comments" with positive connotation (thumbs up, checkmark)
- ❌ **FORBIDDEN:** Badge showing "X participants" labeled as "Supporters" or "Endorsers"
- ❌ **FORBIDDEN:** Badge showing "X objections" labeled as "Opponents" or "Rejections"
- ❌ **FORBIDDEN:** Any badge that implies voting, approval, or decision outcome

### Progress Indicators
- ❌ **FORBIDDEN:** Progress bar based on `comment_count` or `participant_count`
- ❌ **FORBIDDEN:** Percentage completion based on indicator values
- ❌ **FORBIDDEN:** Visual indicators showing "X% toward approval" or similar

### Automation
- ❌ **FORBIDDEN:** Automatic phase transitions based on indicator thresholds
- ❌ **FORBIDDEN:** Automatic promotion to `ready_for_vote` based on indicator values
- ❌ **FORBIDDEN:** Alerts or notifications implying decision readiness based on indicators
- ❌ **FORBIDDEN:** Any logic that uses indicators to determine procedural state

### Comparison and Ranking
- ❌ **FORBIDDEN:** "Top ideas" lists based on indicator values
- ❌ **FORBIDDEN:** Ranking ideas by any indicator value
- ❌ **FORBIDDEN:** Comparison views showing "idea A has more comments than idea B"
- ❌ **FORBIDDEN:** Leaderboards or "trending" lists

---

## Allowed UI Usages

### Display
- ✅ Display indicator values as plain numbers or text
- ✅ Show indicators in neutral colors (gray, blue - not green/success)
- ✅ Display indicators in tooltips or info sections
- ✅ Use indicators for filtering (e.g., "show ideas with comments")

### Filtering
- ✅ Filter by "has comments" / "no comments"
- ✅ Filter by "has objections" / "no objections"
- ✅ Filter by date range (last_activity)
- ✅ Filter by "has participants" / "no participants"

### Information Display
- ✅ Show indicators in idea detail view
- ✅ Display indicators in list view as metadata
- ✅ Use indicators for search/filter functionality
- ✅ Show indicators in analytics dashboards (clearly labeled as analytics)

---

## Rationale: Why These Indicators Are Non-Procedural

### 1. No Voting Semantics
Indicators count discussion activity, not votes. Comments are discussion only and have no voting or decision-making power. No indicator represents a vote, ballot, or formal decision input.

### 2. No Approval Semantics
High comment counts or participant counts do not indicate approval, endorsement, or support. They indicate discussion activity only. Objections are semantic markers, not rejections or disapproval votes.

### 3. No Quorum or Decision Signals
Indicators do not represent quorum requirements, decision readiness, or procedural thresholds. They are informational metrics about discussion activity, not signals for governance actions.

### 4. No Popularity or Priority Ranking
Indicators measure activity, not popularity, priority, or importance. An idea with many comments is not "more popular" or "more important" - it simply has more discussion activity.

### 5. No Automation Triggers
Indicators are read-only analytics. They cannot trigger phase changes, automatic promotions, or any procedural actions. All phase transitions require explicit human action.

### 6. No Comparative Value Judgments
Indicators are descriptive, not evaluative. They describe what has happened (discussion activity), not what should happen (decisions, approvals, priorities).

---

## Implementation Guidelines

### Display Format
- Use neutral, informational formatting
- Display as: "Discussion Activity: 5" (not "5 comments" with positive connotation)
- Use tooltips to clarify analytics-only nature
- Never use success colors or positive indicators

### Labeling
- Always use full descriptive labels: "Discussion Activity" not "Comments"
- Never use labels that imply voting: "Votes", "Support", "Endorsements"
- Never use labels that imply approval: "Approved", "Accepted", "Popular"

### Data Presentation
- Show raw numbers, not percentages or ratios
- Avoid visual comparisons between ideas
- Do not highlight "high" or "low" values
- Present all indicators with equal visual weight

---

## Example: Correct vs. Incorrect Usage

### ❌ INCORRECT
```
"Most Popular Ideas" (sorted by comment_count)
"5 Supporters" (participant_count with positive label)
"80% Approved" (based on objections_count)
"Trending" badge (based on last_activity)
```

### ✅ CORRECT
```
"Discussion Activity: 5" (with tooltip explaining analytics-only)
"Discussion Participants: 3" (with tooltip explaining no support semantics)
"Objection Markers: 2" (with tooltip explaining semantic markers only)
"Last Activity: 2 days ago" (with tooltip explaining activity only)
```

---

**Last Updated:** [Date]  
**Module Version:** PRE-GOVERNANCE v1.0
