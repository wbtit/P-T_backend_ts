# Notification Matrix

> **Instructions:** For each row, mark ✅ under roles to notify. Leave blank for no notification.
> 

## Legend: User Roles

| Short Code | Full Role Name |
| --- | --- |
| SA | SYSTEM_ADMIN |
| ADM | ADMIN |
| SM | SALES_MANAGER |
| SP | SALES_PERSON |
| DM | DEPT_MANAGER |
| PM | PROJECT_MANAGER |
| TL | TEAM_LEAD |
| PMO | PROJECT_MANAGER_OFFICER |
| DGM | DEPUTY_GENERAL_MANAGER |
| OE | OPERATION_EXECUTIVE |
| EH | ESTIMATION_HEAD |
| EST | ESTIMATOR |
| CDE | CONNECTION_DESIGNER_ENGINEER |
| STF | STAFF (Task Assignee / Employee) |
| HR | HUMAN_RESOURCE |
| CLI | CLIENT / CLIENT_ADMIN / CLIENT_PROJECT_COORDINATOR |
| FAB | VENDOR / VENDOR_ADMIN (Fabricator POC) |

---

## 1. 🏗️ PROJECT

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DGM | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | **Project Created** |  | ✅ |  |  | ✅ | ✅ |  | ✅ | ✅ | ✅ | ✅ |  | ✅ |  |  | ✅ | ✅ |  |
| 1.2 | **Project Stage Changed** (e.g. RFI → IFA → IFC) |  | ✅ |  |  | ✅ | ✅ |  | ✅ | ✅ | ✅ |  |  | ✅ | ✅ |  | ✅ | ✅ |  |
| 1.3 | **Project End Date Changed** |  | ✅ |  |  | ✅ |  |  |  | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 1.4 | **Project Status Changed** (ACTIVE / ONHOLD / COMPLETE / DELAY) |  | ✅ |  |  | ✅ | ✅ |  | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 1.5 | **Project Approval Date Set / Changed** |  | ✅ |  |  | ✅ | ✅ |  | ✅ |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 1.6 | **Fabrication Date Set / Changed** |  | ✅ |  |  | ✅ | ✅ |  | ✅ |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 1.7 | **Project Deleted / Soft Deleted** |  | ✅ |  |  |  |  |  | ✅ | ✅ |  |  |  |  |  |  |  |  |  |
| 1.8 | **IFA Completion hits 75% / 100%** |  | ✅ |  |  |  |  |  | ✅ | ✅ | ✅ |  |  |  |  |  | ✅ | ✅ |  |
| 1.9 | **IFC Completion hits 75% / 100%** |  | ✅ |  |  |  |  |  | ✅ | ✅ | ✅ |  |  |  |  |  | ✅ | ✅ |  |
| 1.10 | **Note Added to Project** |  | ✅ |  |  | ✅ | ✅ | ✅ |  | ✅ | ✅ |  |  | ✅ | ✅ |  |  |  |  |

---

## 2. 📋 TASKS

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DGM | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2.1 | **Task Assigned to Employee** |  |  |  |  |  |  |  |  |  |  |  |  |  | ✅ |  |  |  |  |
| 2.2 | **Task Status Changed** (e.g. IN_PROGRESS, IN_REVIEW, REWORK) |  |  |  |  | ✅ | ✅ |  |  |  |  |  |  |  | ✅ |  |  |  |  |
| 2.3 | **Task Completed** |  |  |  |  |  |  |  |  |  |  |  |  |  | ✅ |  |  |  |  |
| 2.4 | **Duplicate Task Detected** (same task assigned again) |  | ✅ |  |  |  |  |  |  | ✅ | ✅ |  |  |  |  |  |  |  |  |
| 2.5 | **Task reaches 75% of allocated hours** (cron) |  | ✅ |  |  |  |  |  |  | ✅ | ✅ |  |  |  | ✅ |  |  |  |  |
| 2.6 | **Task overruns allocated hours** (cron) |  | ✅ |  |  | ✅ | ✅ |  |  | ✅ | ✅ |  |  |  | ✅ |  |  |  |  |
| 2.7 | **Task auto-close warning sent** (cron) |  |  |  |  |  |  |  |  |  |  |  |  |  | ✅ |  |  |  |  |
| 2.8 | **Task Due Date Approaching** |  |  |  |  | ✅ | ✅ | ✅ |  |  |  |  |  |  | ✅ |  |  |  |  |
| 2.9 | **Task Overdue** |  |  |  |  | ✅ | ✅ | ✅ |  |  |  |  |  |  | ✅ |  |  |  |  |
| 2.10 | **Comment Added on Task** |  |  |  |  | ✅ | ✅ | ✅ |  |  |  |  |  |  | ✅ |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## 3. 📑 RFQ (Request for Quotation)

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1 | **RFQ Created / Sent** |  | ✅ | ✅ | ✅ |  |  |  |  |  |  |  |  |  |  |  | ✅ | ✅ |  |
| 3.2 | **RFQ Response Received** |  | ✅ | ✅ | ✅ |  |  |  |  |  |  |  |  |  |  |  | ✅ | ✅ |  |
| 3.3 | **RFQ Status Changed** (OPEN → IN_REVIEW → APPROVED, etc.) |  | ✅ | ✅ | ✅ |  |  |  |  |  |  |  |  |  |  |  | ✅ | ✅ |  |
| 3.4 | **RFQ Assigned for Estimation** |  |  |  |  |  |  |  |  |  |  | ✅ | ✅ |  |  |  |  |  |  |
| 3.5 | **RFQ Awarded / Rejected** |  | ✅ | ✅ | ✅ |  |  |  |  |  |  |  |  |  |  |  | ✅ | ✅ |  |
| 3.6 | **RFQ Re-Estimation Requested** |  | ✅ | ✅ | ✅ |  |  |  |  |  |  | ✅ | ✅ |  |  |  | ✅ | ✅ |  |

---

## 4. 📝 ESTIMATION

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4.1 | **Estimation Created** |  |  |  |  |  |  |  |  | ✅ |  | ✅ | ✅ |  |  |  |  |  |  |
| 4.2 | **Estimation Task Assigned to Estimator** |  |  |  |  |  |  |  |  | ✅ |  | ✅ | ✅ |  |  |  |  |  |  |
| 4.3 | **Estimation Status Changed** (DRAFT → IN_PROGRESS → PENDING_REVIEW → APPROVED / REJECTED) |  |  |  |  |  |  |  |  | ✅ |  | ✅ | ✅ |  |  |  |  |  |  |
| 4.4 | **Estimation Approved** |  |  |  |  |  |  |  |  | ✅ |  | ✅ | ✅ |  |  |  |  |  |  |
| 4.5 | **Estimation Rejected / Re-estimation Required** |  |  |  |  |  |  |  |  | ✅ |  | ✅ | ✅ |  |  |  |  |  |  |
| 4.6 | **Estimation hours at 75% used** (cron) |  |  |  |  |  |  |  |  | ✅ |  | ✅ | ✅ |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## 5. 📁 RFI (Request for Information)

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5.1 | **RFI Created / Sent** |  | ✅ |  |  | ✅ | ✅ | ✅ |  | ✅ | ✅ |  |  | ✅ | ✅ |  | ✅ | ✅ |  |
| 5.2 | **RFI Response Received** |  | ✅ |  |  | ✅ | ✅ | ✅ |  | ✅ | ✅ |  |  | ✅ | ✅ |  | ✅ | ✅ |  |
| 5.3 | **RFI Approved by Admin** |  | ✅ |  |  | ✅ | ✅ | ✅ |  | ✅ | ✅ |  |  | ✅ | ✅ |  | ✅ | ✅ |  |
| 5.4 | **RFI Reply Thread Added** |  | ✅ |  |  | ✅ | ✅ | ✅ |  | ✅ | ✅ |  |  | ✅ | ✅ |  | ✅ | ✅ |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## 6. 📤 SUBMITTALS

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6.1 | **Submittal Created / Sent** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 6.2 | **Submittal Response Received** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 6.3 | **Submittal Approved** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 6.4 | **Submittal Revised Resubmittal Required** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 6.5 | **New Submittal Version Uploaded** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |

---

## 7. 🔄 CHANGE ORDER (CO)

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7.1 | **Change Order Created / Sent** |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 7.2 | **Change Order Accepted by Fabricator** |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 7.3 | **Change Order Rejected by Fabricator** |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 7.4 | **CO Response / Reply Received** |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 7.5 | **Change Order Approved by Admin** |  | ✅ |  |  | ✅ |  |  | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |

---

## 8. 🪨 MILESTONES

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8.1 | **Milestone Created** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 8.2 | **Milestone Response Received** (ON_TIME / DELAYED / CLARIFICATION_REQUIRED) |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 8.3 | **Milestone is DELAYED** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 8.4 | **Milestone Approaching Due Date** (cron) |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |
| 8.5 | **New Milestone Version Created** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  | ✅ |  |  | ✅ | ✅ |  |

---

## 9. 🖼️ DESIGN DRAWINGS

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9.1 | **Design Drawing Uploaded** |  | ✅ |  |  | ✅ | ✅ | ✅ |  | ✅ |  | ✅ |  | ✅ |  |  | ✅ | ✅ |  |
| 9.2 | **Design Drawing Response Received** |  | ✅ |  |  | ✅ | ✅ | ✅ |  | ✅ |  | ✅ |  | ✅ |  |  | ✅ | ✅ |  |
| 9.3 | **Design Drawing Approved** |  | ✅ |  |  | ✅ | ✅ | ✅ |  | ✅ |  | ✅ |  | ✅ |  |  | ✅ | ✅ |  |

---

## 10. 🏢 FABRICATOR

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10.1 | **Fabricator Created** |  | ✅ | ✅ | ✅ |  |  |  |  | ✅ |  |  |  |  |  |  | ✅ | ✅ |  |
| 10.2 | **Fabricator Updated** |  | ✅ | ✅ | ✅ |  |  |  |  | ✅ |  |  |  |  |  |  | ✅ | ✅ |  |
| 10.3 | **Fabricator Deleted** |  | ✅ | ✅ | ✅ |  |  |  |  | ✅ |  |  |  |  |  |  | ✅ | ✅ |  |
| 10.4 | **Fabricator Invoice Created** |  | ✅ | ✅ | ✅ |  |  |  |  | ✅ |  |  |  |  |  |  | ✅ | ✅ |  |

---

## 11. 🗂️ DEPARTMENT

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11.1 | **Department Created** |  | ✅ |  |  |  |  |  |  | ✅ |  |  |  |  |  | ✅ |  |  |  |
| 11.2 | **Department Updated** |  | ✅ |  |  |  |  |  |  | ✅ |  |  |  |  |  | ✅ |  |  |  |
| 11.3 | **Department Deleted** |  | ✅ |  |  |  |  |  |  | ✅ |  |  |  |  |  | ✅ |  |  |  |

---

## 12. 🗓️ MEETINGS

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12.1 | **Meeting Scheduled** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  |  |  |  | ✅ | ✅ |  |
| 12.2 | **Meeting Cancelled** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  |  |  |  | ✅ | ✅ |  |
| 12.3 | **Meeting Rescheduled** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  |  |  |  | ✅ | ✅ |  |
| 12.4 | **Meeting Reminder** (cron — before start time) |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  |  |  |  | ✅ | ✅ |  |
| 12.5 | **RSVP Response Received** |  | ✅ |  |  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |  |  |  |  | ✅ | ✅ |  |

---

## 13. 💰 INVOICE

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13.1 | **Invoice Created** |  | ✅ |  |  |  |  |  | ✅ |  |  |  |  | ✅ |  |  | ✅ | ✅ |  |
| 13.2 | **Invoice Status → PAID** |  | ✅ |  |  |  |  |  | ✅ |  |  |  |  | ✅ |  |  | ✅ | ✅ |  |
| 13.3 | **Invoice Status → OVERDUE** (cron) |  | ✅ |  |  |  |  |  | ✅ |  |  |  |  | ✅ |  |  | ✅ | ✅ |  |
| 13.4 | **Invoice Status → PARTIALLY_PAID** |  | ✅ |  |  |  |  |  | ✅ |  |  |  |  | ✅ |  |  | ✅ | ✅ |  |
| 13.5 | **Invoice Cancelled** |  | ✅ |  |  |  |  |  | ✅ |  |  |  |  | ✅ |  |  | ✅ | ✅ |  |

---

## 14. 📡 CLIENT COMMUNICATIONS

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 14.1 | **Client Communication Log Created** |  |  |  |  |  |  |  |  | ✅ | ✅ |  |  |  |  |  |  |  |  |
| 14.2 | **Follow-Up Date Approaching** (cron) |  |  |  |  |  |  |  |  | ✅ | ✅ |  |  |  |  |  |  |  |  |
| 14.3 | **Follow-Up Overdue** (cron) |  |  |  |  |  |  |  |  | ✅ | ✅ |  |  |  |  |  |  |  |  |

---

## 15. 👥 USER / TEAM

| # | Action / Trigger | SA | ADM | SM | SP | DM | PM | TL | PMO | DEP | OE | EH | EST | CDE | STF | HR | CLI | FAB | Currently Implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15.1 | **New User Created / Onboarded** |  | ✅ |  |  |  |  |  |  |  |  |  |  |  |  | ✅ |  |  |  |
| 15.2 | **User Role Changed** |  | ✅ |  |  |  |  |  |  |  |  |  |  |  |  | ✅ |  |  |  |
| 15.3 | **User Added to Team** |  | ✅ |  |  |  |  |  |  |  |  |  |  |  |  | ✅ |  |  |  |
| 15.4 | **User Removed from Team** |  | ✅ |  |  |  |  |  |  |  |  |  |  |  |  | ✅ |  |  |  |