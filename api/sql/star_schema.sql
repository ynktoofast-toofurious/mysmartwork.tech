-- Mwangaza star schema for PostgreSQL / Neon
create table if not exists dim_date (
  date_key int primary key,
  full_date date not null,
  year smallint not null,
  month smallint not null,
  day smallint not null,
  month_name varchar(20) not null
);

create table if not exists dim_location (
  location_key bigserial primary key,
  city varchar(80) not null unique,
  country varchar(80) default 'RDC'
);

create table if not exists dim_category (
  category_key bigserial primary key,
  category_name varchar(120) not null unique
);

create table if not exists dim_status (
  status_key bigserial primary key,
  status_name varchar(50) not null unique
);

create table if not exists dim_severity (
  severity_key bigserial primary key,
  severity_name varchar(50) not null unique
);

create table if not exists dim_institution (
  institution_key bigserial primary key,
  institution_name varchar(200) not null unique
);

create table if not exists dim_user (
  user_key bigserial primary key,
  full_name varchar(200) not null,
  email varchar(200) not null unique,
  role_name varchar(60) not null,
  location_key bigint references dim_location(location_key)
);

create table if not exists dim_plan (
  plan_key bigserial primary key,
  plan_name varchar(50) not null unique,
  monthly_price numeric(12,2)
);

create table if not exists fact_incident (
  incident_key bigserial primary key,
  incident_ref varchar(30) not null unique,
  date_key int references dim_date(date_key),
  category_key bigint references dim_category(category_key),
  status_key bigint references dim_status(status_key),
  severity_key bigint references dim_severity(severity_key),
  institution_key bigint references dim_institution(institution_key),
  location_key bigint references dim_location(location_key),
  description text default '',
  reporter_reference text default 'Non fourni',
  revision integer default 0,
  ingestion_source varchar(40) default 'static_seed',
  inserted_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

create table if not exists fact_subscription (
  subscription_key bigserial primary key,
  institution_key bigint references dim_institution(institution_key),
  plan_key bigint references dim_plan(plan_key),
  start_date_key int references dim_date(date_key),
  renewal_date_key int references dim_date(date_key),
  amount numeric(12,2),
  state varchar(40),
  inserted_at timestamp default current_timestamp
);

create table if not exists fact_access_event (
  access_key bigserial primary key,
  event_time timestamp default current_timestamp,
  route varchar(200) not null,
  location_text varchar(200),
  user_email varchar(200),
  user_agent varchar(500),
  event_type varchar(40) default 'seo_access',
  ip_address varchar(80),
  metadata text
);

create table if not exists audit_trail (
  audit_key bigserial primary key,
  table_name varchar(120) not null,
  record_id varchar(120) not null,
  action_type varchar(40) not null,
  changed_by varchar(200),
  changed_at timestamp default current_timestamp,
  old_value text,
  new_value text
);
