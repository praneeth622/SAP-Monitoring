-- Table: Systems
CREATE TABLE systems (
    system_id SERIAL PRIMARY KEY,
    system_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: Monitoring Areas
CREATE TABLE monitoring_areas (
    area_id SERIAL PRIMARY KEY,
    system_id INT NOT NULL,
    area_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems(system_id) ON DELETE CASCADE,
    UNIQUE(system_id, area_name)
);

-- Table: KPI Groups
CREATE TABLE kpi_groups (
    group_id SERIAL PRIMARY KEY,
    area_id INT NOT NULL,
    system_id INT NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES monitoring_areas(area_id) ON DELETE CASCADE,
    FOREIGN KEY (system_id) REFERENCES systems(system_id) ON DELETE CASCADE,
    UNIQUE(area_id, group_name)
);

-- Table: KPIs
CREATE TABLE kpis (
    kpi_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL,
    area_id INT NOT NULL,
    system_id INT NOT NULL,
    kpi_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES kpi_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (area_id) REFERENCES monitoring_areas(area_id) ON DELETE CASCADE,
    FOREIGN KEY (system_id) REFERENCES systems(system_id) ON DELETE CASCADE,
    UNIQUE(group_id, kpi_name)
);

-- Table: KPI Metrics (Actual Metric Data)
CREATE TABLE kpi_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    kpi_id INT NOT NULL,
    metric_value DECIMAL(18,4) NOT NULL,
    measured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kpi_id) REFERENCES kpis(kpi_id) ON DELETE CASCADE,
    INDEX (kpi_id, measured_at)
);
