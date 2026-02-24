

---

# 📘 **P-T_backend_ts — Transparent Task Tracking & Performance Analytics System**

This backend powers a **robust, auditable, data-driven task tracking system** designed to eliminate manipulation, ensure fairness, and give management full clarity into productivity and planning accuracy.

This document explains the **key analytical frameworks** built into the system:

* **MEAS** — Manager Estimation Accuracy Score
* **Bias Detection Engine**
* **MEAS Trendline Generator (6 months)**
* **EPS** — Employee Performance Score

These features directly address historical issues like:

✔ Manipulated allocated hours
✔ Fake efficiency
✔ Manager bias
✔ Incorrect task logs
✔ Poor planning visibility

---

# 🧠 **MANAGER ESTIMATION ACCURACY SCORE (MEAS)**

**Score Range:** `0 → 100`

| Score    | Meaning                      |
| -------- | ---------------------------- |
| **100**  | Perfect estimation accuracy  |
| **> 80** | Good, reliable estimation    |
| **< 60** | Poor estimation accuracy     |
| **< 40** | Requires immediate oversight |

### 🎯 MEAS Reveals:

* Managers who **under-allocate** to artificially increase team “efficiency”
* Managers who **over-allocate** (padding work, slowing throughput)
* Managers who are **accurate and consistent**
* Projects with **high risk** due to poor planning
* Employees suffering from **unrealistic deadlines**

---

## 🧮 **MEAS Calculation Per Task**

```
deviation = |actualHours - allocatedHours| / allocatedHours
accuracy = max(0, 100 - deviation * 100)
```

### Monthly MEAS:

```
MEAS = average(accuracy across all tasks for the month)
```

---

# 🎯 **MANAGER BIAS DETECTION**

Bias is the manager’s tendency to systematically over- or under-estimate task hours.

### **Formula**

```
bias = (actualHours - allocatedHours) / allocatedHours
```

### **Interpretation Table**

| Bias Value         | Meaning                              | Behavior                         |
| ------------------ | ------------------------------------ | -------------------------------- |
| **> +0.20 (+20%)** | Manager consistently under-estimates | ❌ Unrealistic deadlines — BAD    |
| **< -0.20 (−20%)** | Manager consistently over-estimates  | ⚠ Inefficient planning — padding |
| **-0.20 → +0.20**  | Healthy, balanced estimation         | ✅ GOOD                           |

### Why It Matters

* Protects employees from **overload**
* Exposes **padding** and hidden inefficiency
* Creates **real planning accountability**
* Helps leadership coach managers effectively

---

# 📈 **MEAS Trendline Generator (Last 6 Months)**

This is one of the MOST valuable analytics tools.

### It Shows:

* Whether a manager is **improving or declining**
* Consistency of estimation quality
* Impact of complexity/training
* Project-level planning stability
* Reliability & predictability trends

### Output Example:

```
[
  { period: "2024-10", score: 77 },
  { period: "2024-11", score: 80 },
  { period: "2024-12", score: 82 },
  { period: "2025-01", score: 84 },
  { period: "2025-02", score: 88 },
  { period: "2025-03", score: 91 }
]
```

Leadership can visually identify:

* Improvement curve 📈
* Decline 📉
* Inconsistency ⚠
* High-performance stability 🌟

---

# ⭐ **EMPLOYEE PERFORMANCE SCORE (EPS) — Complete Overview**

EPS ensures employees are evaluated **only based on transparent, system-tracked data**, NOT:

✘ Fake efficiency
✘ Manual edits
✘ Incorrect allocations
✘ Manager favoritism
✘ Subjective reviews

EPS = Weighted score derived from **6 pillars**.

---

## 📊 **EPS Pillars & Weights**

| Pillar                           | Meaning                            | Weight  |
| -------------------------------- | ---------------------------------- | ------- |
| **1. Task Completion Rate**      | Completed vs assigned tasks        | **25%** |
| **2. Overrun Behavior**          | Exceeding allocated hours          | **20%** |
| **3. Underutilization Behavior** | Finishing too fast (<60% of time)  | **10%** |
| **4. Rework Frequency**          | Number of tasks needing rework     | **20%** |
| **5. Time Discipline**           | Forgot stop, auto-closings, breaks | **15%** |
| **6. Session Quality**           | Idle vs active time                | **10%** |

---

# ⭐ EMPLOYEE PERFORMANCE METRICS (DETAILED)

---

## 1️⃣ **Task Completion Rate (25%)**

```
completionScore = completedTasks / assignedTasks
```

Measured monthly.

---

## 2️⃣ **Overrun Behavior (20%)**

```
overrunCount = tasks where actual > allocated
overrunPercent = overrunCount / completedTasks
overrunScore = 100 - (overrunPercent * 100)
```

High overruns = poor time estimation or work inefficiency.

---

## 3️⃣ **Underutilization Behavior (10%)**

Triggered if employee finishes task using **< 60% allocated time**.

```
underutilizedScore = 100 - (underutilizedPercent * 100)
```

Meaning:

* Rushing work
* Shallow implementation
* Lack of task depth
* Overconfidence in work speed

---

## 4️⃣ **Rework Frequency (20%)**

```
reworkScore = 100 - (reworkTasks / totalTasks * 100)
```

High rework count signals:

* Low quality
* Poor attention to detail
* Misunderstanding requirements

---

## 5️⃣ **Time Discipline Score (15%)**

Automatically penalizes system-detected behaviors:

| Flag Type              | Penalty |
| ---------------------- | ------- |
| Auto-close             | 5%      |
| Forgot-stop            | 3%      |
| Frequent rework starts | 2%      |
| Excessive pauses       | 1%      |

```
disciplineScore = 100 - (flagsCount * penaltyWeight)
```

---

## 6️⃣ **Session Quality Score (10%)**

```
idlePercentage = idleTime / activeTime
```

If idle > 20% → score reduced.

Shows:

* How focused the employee is
* Whether work is continuous or too fragmented

---

# ⭐ **Final EPS Score Formula**

```
EPS =
  completionScore * 0.25 +
  overrunScore * 0.20 +
  underutilizedScore * 0.10 +
  reworkScore * 0.20 +
  disciplineScore * 0.15 +
  sessionScore * 0.10
```

Range: `0 → 100`

---

# ⭐ **EPS Interpretation**

| Score      | Meaning                   |
| ---------- | ------------------------- |
| **90–100** | Outstanding performer     |
| **75–89**  | Strong and reliable       |
| **60–74**  | Average — needs guidance  |
| **40–59**  | Needs improvement         |
| **< 40**   | Serious performance issue |

---

# 🎯 **Why These Metrics Matter**

✔ Eliminate manipulation of allocated hours
✔ Track work discipline accurately
✔ Identify underperforming or overloaded employees
✔ Identify poor managers early
✔ Bring complete transparency across hierarchy
✔ Enable CEO to take **data-driven** decisions
✔ Build a **mature, metric-driven engineering culture**

---

## Team Efficiency Score (TES)

TES is a monthly team-level score (`0..100`) that combines employee execution quality and delivery outcomes.

### TES components

- `avgEps`: average employee EPS of team members for the month.
- `measScore` (optional): average MEAS for the team manager across projects mapped to that team for the month.
- `onTimeCompletion`: percentage of completed tasks finished on/before due date.
- `throughput`: completed-in-month tasks / assigned-in-month tasks.
- `reworkRate`: percentage of completed tasks with rework segments.
- `reworkScore`: `100 - reworkRate`.

### TES formulas

When MEAS exists for the team context:

```text
TES =
  avgEps * 0.35 +
  measScore * 0.20 +
  onTimeCompletion * 0.20 +
  throughput * 0.15 +
  reworkScore * 0.10
```

When MEAS is unavailable:

```text
TES =
  avgEps * 0.40 +
  onTimeCompletion * 0.25 +
  throughput * 0.20 +
  reworkScore * 0.15
```

### Persistence

TES snapshots are persisted (upsert by `teamId + period`) in table:

- `team_efficiency_score`

If the table/migration is not yet applied, the API still returns computed TES and logs a persistence warning.

### Monthly cron

TES monthly batch is scheduled in `Asia/Kolkata` timezone:

- `0 3 1 * *` (1st day of every month at 03:00)

Implementation:

- Cron wrapper: `src/corn-jobs/safeCorn.ts`
- Batch runner: `src/corn-jobs/runMonthlyTES.ts`
- Calculation service: `src/services/teamEfficiencyService.ts`

---
---
# 📊 **Role-Based Dashboards (What, Why, How It Helps)**

This module exposes role-focused dashboard endpoints under `GET /v1/dashBoardData/*`.

## 1) `GET /dashBoardData` (System / Core dashboard)

### What it shows
- Project status summary (`ACTIVE`, `COMPLETE`, `ONHOLD`)
- Total projects
- Active employee count
- Workflow pending/new counts for `RFI`, `RFQ`, `ChangeOrder`, `Submittals`

### Why we show it
- Gives a fast operational pulse across delivery + communication workflows.

### How it helps
- Leadership can quickly detect operational bottlenecks and backlog growth.

---

## 2) `GET /dashBoardData/projectManager`

### What it shows
- Project status split for manager-owned projects
- Task metrics: total, completed, pending, overdue, completion rate
- Team size under manager
- Pending/new items in `RFI`, `ChangeOrder`, `RFQ`, `Submittals`

### Why we show it
- Project managers need execution control + risk visibility in one place.

### How it helps
- Enables proactive intervention on slippage, overdue work, and blocked approvals.

---

## 3) `GET /dashBoardData/departmentManager`

### What it shows
- Department people overview (employees, active/inactive, teams)
- Work overview (projects, tasks, task/project status distributions)
- Score summaries (MEAS/Bias/EPS overall + current month)
- Top managers and top employees in department

### Why we show it
- Department managers need both delivery capacity and performance quality.

### How it helps
- Supports staffing decisions, coaching plans, and department-level governance.

---

## 4) `GET /dashBoardData/hr`

### What it shows
- Workforce analytics (total/active/inactive/new employees, role and department distribution)
- Score trends and aggregates (MEAS, Bias, EPS)
- Top/bottom performers and manager behavior categories (under/over/balanced estimation)

### Why we show it
- HR needs objective workforce signals tied to performance and fairness.

### How it helps
- Improves appraisal quality, training targeting, and policy enforcement.

---

## 5) `GET /dashBoardData/clientAdmin`

### What it shows
- Fabricator-linked project status summary
- Pending client-facing workflow items (`RFI`, `RFQ`, `ChangeOrder`, `Submittals`)

### Why we show it
- Client admins need a concise visibility layer on open coordination items.

### How it helps
- Reduces missed responses and improves turnaround in external communication loops.

---

## 6) `GET /dashBoardData/client`

### What it shows
- Client-accessible project status summary
- Pending communication/workflow queues (`RFI`, `RFQ`, `ChangeOrder`, `Submittals`)

### Why we show it
- Clients need transparency without deep internal operational noise.

### How it helps
- Keeps client-side stakeholders aligned on what requires action from them.

---

## 7) `GET /dashBoardData/sales`

In `GET /dashBoardData/sales`, user sees:

1. `totalRFQs`
- Total opportunities received.
- Helps measure pipeline size.

2. `inPipelineRFQs`
- RFQs still open/in-progress.
- Helps understand active workload and future revenue potential.

3. `quotedRFQs`
- RFQs moved to quote stage.
- Shows execution progress from lead to pricing.

4. `awardedRFQs`
- Won deals.
- Core success metric for sales performance.

5. `rejectedRFQs`
- Lost deals.
- Helps identify loss rate and improve pricing/strategy.

6. `respondedRFQs`
- RFQs with at least one response.
- Indicates operational responsiveness.

7. `totalProjectsFromSales`
- RFQs converted into projects.
- Measures business impact beyond quoting.

8. `activeProjectsFromSales`
- Ongoing delivery from sales wins.
- Shows live commitments and delivery load.

9. `completedProjectsFromSales`
- Delivered projects from sales wins.
- Reflects realized value and execution maturity.

10. `winRate`
- `awardedRFQs / totalRFQs`.
- Fast health indicator of sales effectiveness.

11. `quoteToAwardRate`
- `awardedRFQs / quotedRFQs`.
- Tells how competitive/accurate your quotes are.

12. `responseRate`
- `respondedRFQs / totalRFQs`.
- Tracks follow-up discipline and SLA behavior.

13. `projectConversionRate`
- `convertedToProjects / totalRFQs`.
- Measures how many opportunities turn into real work.

14. `totalBidPrice`
- Sum of RFQ bid values.
- Approximate total quoted pipeline value.

15. `avgBidPrice`
- Average deal size.
- Useful for forecasting and segment strategy.

16. `topSalesPeople`
- Top 5 by awarded count (plus win rate and total RFQs).
- Helps coaching, recognition, and load balancing.

17. `invoiceAnalytics`
- `totalInvoices`, `paidInvoices`, `pendingInvoices`, `overdueInvoices`, `partiallyPaidInvoices`, `cancelledInvoices`
- `totalInvoicedValue`, `collectedInvoiceValue`, `collectionRate`, `avgInvoiceValue`
- Connects sales to cash realization; helps spot revenue leakage and payment risk.

How it helps overall:
- Combines funnel metrics (`RFQ -> Quote -> Award -> Project`) and cash metrics (Invoice/Collection), so leadership can see not just activity but actual business outcome and cash-flow quality.

---

## 8) `GET /dashBoardData/operationExecutive`

### What it shows
- `projectStats` (global project status overview)
- Project tracking actions:
  - RFIs where client-side recipient has not responded for > 2 weeks
  - Submittals tracking list (latest items)
  - RFQs where the operation executive is recipient

### Why we show it
- Operations executive role is coordination-heavy and deadline-driven.

### How it helps
- Surfaces stuck communication early, improves follow-up discipline, and prevents process drift.

---
