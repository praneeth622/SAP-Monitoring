-- Table: Systems
CREATE TABLE systems (
    system_id SERIAL PRIMARY KEY,
    system_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP,
    updated_by VARCHAR(255)
);

-- Table: Monitoring Areas
CREATE TABLE monitoring_areas (
    area_id SERIAL PRIMARY KEY,
    system_id VARCHAR(10) NOT NULL,
    area_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP,
    updated_by VARCHAR(255),
    FOREIGN KEY (system_id) REFERENCES systems(system_id) ON DELETE CASCADE,
    UNIQUE(system_id, area_name)
);

-- Table: KPI Groups
CREATE TABLE kpi_groups (
    group_id SERIAL PRIMARY KEY,
    area_id INT NOT NULL,
    system_id VARCHAR(10) NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP,
    updated_by VARCHAR(255),
    FOREIGN KEY (area_id) REFERENCES monitoring_areas(area_id) ON DELETE CASCADE,
    FOREIGN KEY (system_id) REFERENCES systems(system_id) ON DELETE CASCADE,
    UNIQUE(area_id, group_name)
);

-- Table: KPIs
CREATE TABLE kpis (
    kpi_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL,
    area_id INT NOT NULL,
    system_id VARCHAR(10) NOT NULL,
    kpi_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP,
    updated_by VARCHAR(255),
    FOREIGN KEY (group_id) REFERENCES kpi_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (area_id) REFERENCES monitoring_areas(area_id) ON DELETE CASCADE,
    FOREIGN KEY (system_id) REFERENCES systems(system_id) ON DELETE CASCADE,
    UNIQUE(group_id, kpi_name)
);

