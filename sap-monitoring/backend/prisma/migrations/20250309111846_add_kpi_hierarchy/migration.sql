-- CreateTable
CREATE TABLE "Systems" (
    "id" SERIAL NOT NULL,
    "systemId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "systemUrl" TEXT NOT NULL,
    "systemType" TEXT NOT NULL,
    "pollingStatus" TEXT NOT NULL,
    "connectionStatus" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "Systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemsDummy" (
    "id" SERIAL NOT NULL,
    "systemId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "systemUrl" TEXT NOT NULL,
    "systemType" TEXT NOT NULL,
    "pollingStatus" TEXT NOT NULL,
    "connectionStatus" TEXT NOT NULL,
    "description" TEXT,
    "userID" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,

    CONSTRAINT "SystemsDummy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringArea" (
    "areaId" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "MonitoringArea_pkey" PRIMARY KEY ("areaId")
);

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

-- CreateTable
CREATE TABLE "KpiGroup" (
    "groupId" SERIAL NOT NULL,
    "areaId" INTEGER NOT NULL,
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "monitoringAreaId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "KpiGroup_pkey" PRIMARY KEY ("groupId")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "kpiId" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,
    "id" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "kpiGroupId" INTEGER NOT NULL,
    "monitoringAreaId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("kpiId")
);

-- CreateTable
CREATE TABLE "kpi_hierarchy" (
    "id" SERIAL NOT NULL,
    "sid" TEXT NOT NULL,
    "monitoringArea" TEXT NOT NULL,
    "kpiGroup" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "kpiDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Systems_systemId_key" ON "Systems"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemsDummy_systemId_key" ON "SystemsDummy"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringArea_id_key" ON "MonitoringArea"("id");

-- CreateIndex
CREATE UNIQUE INDEX "KpiGroup_id_key" ON "KpiGroup"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_id_key" ON "Kpi"("id");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_hierarchy_sid_monitoringArea_kpiGroup_kpiName_key" ON "kpi_hierarchy"("sid", "monitoringArea", "kpiGroup", "kpiName");

-- AddForeignKey
ALTER TABLE "MonitoringArea" ADD CONSTRAINT "MonitoringArea_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "Systems"("systemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiGroup" ADD CONSTRAINT "KpiGroup_monitoringAreaId_fkey" FOREIGN KEY ("monitoringAreaId") REFERENCES "MonitoringArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiGroup" ADD CONSTRAINT "KpiGroup_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "Systems"("systemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_kpiGroupId_fkey" FOREIGN KEY ("kpiGroupId") REFERENCES "KpiGroup"("groupId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_monitoringAreaId_fkey" FOREIGN KEY ("monitoringAreaId") REFERENCES "MonitoringArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "Systems"("systemId") ON DELETE CASCADE ON UPDATE CASCADE;
