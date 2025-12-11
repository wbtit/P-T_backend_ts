# P-T_backend_ts

MANAGER ESTIMATION ACCURACY SCORE (MEAS)
Score range: 0 → 100

Where:

100 = Perfect estimation accuracy

Above 80 = Good

Below 60 = Poor

Below 40 = Needs immediate oversight

This can expose:

Managers who consistently under-allocate (to show fake efficiency)

Managers who over-allocate (padding work)

Managers who estimate well (high-performing)

Projects at risk due to poor planning

Employees who are overloaded or underutilized
===========================================================
How Bias Is Calculated

For each completed task:

bias = (actualHours - allocatedHours) / allocatedHours


Interpretation:

Bias Value	Meaning	Behavior
> +0.20 (20% under-allocation)	Manager consistently underestimates	BAD – unrealistic deadlines
< -0.20 (20% over-allocation)	Manager overestimates	INEFFICIENT – padding
between -0.20 and +0.20	Healthy	GOOD