**1. Systems Table**

-   Stores individual system details.
-   Each system is uniquely identifiable.

**2. Monitoring Areas Table**

-   Captures high-level monitoring categories (e.g., CPU, Network).
-   Each Monitoring Area is linked explicitly to a system.
y54gtrhkebfjnm,

**3. KPI Groups Table**

-   Represents grouped subsets of metrics within Monitoring Areas.
-   Each KPI Group explicitly links to its parent Monitoring Area and the associated system.

**4. KPIs Table**

-   Defines individual measurable metrics.
-   Links to KPI Group, Monitoring Area, and the System explicitly for clear hierarchical integrity and faster retrieval.

