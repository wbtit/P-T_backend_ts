

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

