-- CreateTable
CREATE TABLE "System" (
    "id" SERIAL NOT NULL,
    "system_id" VARCHAR(4) NOT NULL,
    "client" VARCHAR(4) NOT NULL,
    "system_name" VARCHAR(255) NOT NULL,
    "system_url" VARCHAR(255) NOT NULL,
    "system_type" VARCHAR(10) NOT NULL,
    "polling_status" VARCHAR(2) NOT NULL,
    "connection_status" VARCHAR(2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(255),
    "updated_at" TIMESTAMP(3),
    "updated_by" VARCHAR(255),

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemDummy" (
    "id" SERIAL NOT NULL,
    "system_id" VARCHAR(4) NOT NULL,
    "client" VARCHAR(4) NOT NULL,
    "system_name" VARCHAR(255) NOT NULL,
    "system_url" VARCHAR(255) NOT NULL,
    "system_type" VARCHAR(10) NOT NULL,
    "polling_status" VARCHAR(2) NOT NULL,
    "connection_status" VARCHAR(2) NOT NULL,
    "description" TEXT,
    "userID" VARCHAR(20) NOT NULL,
    "password" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(255),
    "updated_at" TIMESTAMP(3),
    "updated_by" VARCHAR(255),

    CONSTRAINT "SystemDummy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiGroup" (
    "group_id" SERIAL NOT NULL,
    "area_id" INTEGER NOT NULL,
    "ID" INTEGER NOT NULL,
    "group_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(255),
    "updated_at" TIMESTAMP(3),
    "updated_by" VARCHAR(255),

    CONSTRAINT "KpiGroup_pkey" PRIMARY KEY ("group_id")
);

-- CreateTable
CREATE TABLE "MonitoringArea" (
    "area_id" SERIAL NOT NULL,
    "ID" INTEGER NOT NULL,
    "area_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(255),
    "updated_at" TIMESTAMP(3),
    "updated_by" VARCHAR(255),

    CONSTRAINT "MonitoringArea_pkey" PRIMARY KEY ("area_id")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "kpi_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "area_id" INTEGER NOT NULL,
    "ID" INTEGER NOT NULL,
    "kpi_name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(50),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(255),
    "updated_at" TIMESTAMP(3),
    "updated_by" VARCHAR(255),

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("kpi_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiGroup_area_id_group_name_key" ON "KpiGroup"("area_id", "group_name");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringArea_ID_area_name_key" ON "MonitoringArea"("ID", "area_name");

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_group_id_kpi_name_key" ON "Kpi"("group_id", "kpi_name");

-- AddForeignKey
ALTER TABLE "KpiGroup" ADD CONSTRAINT "KpiGroup_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "MonitoringArea"("area_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiGroup" ADD CONSTRAINT "KpiGroup_ID_fkey" FOREIGN KEY ("ID") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringArea" ADD CONSTRAINT "MonitoringArea_ID_fkey" FOREIGN KEY ("ID") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "KpiGroup"("group_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "MonitoringArea"("area_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_ID_fkey" FOREIGN KEY ("ID") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
