-- CreateTable
CREATE TABLE "monitoring_kpi" (
    "id" SERIAL NOT NULL,
    "systemId" VARCHAR(50),
    "client" INTEGER,
    "monitoringArea" VARCHAR(100),
    "kpiGroup" VARCHAR(100),
    "kpiName" VARCHAR(100),
    "parentKpi" VARCHAR(100),
    "kpiDescription" TEXT,
    "dataType" VARCHAR(50),
    "unit" VARCHAR(50),
    "aggregation" VARCHAR(50),
    "drilldown" BOOLEAN,
    "filter" BOOLEAN,
    "secondLevelDetails" JSONB,
    "filterValues" JSONB,
    "drilldownCondition" JSONB,

    CONSTRAINT "monitoring_kpi_pkey" PRIMARY KEY ("id")
);
