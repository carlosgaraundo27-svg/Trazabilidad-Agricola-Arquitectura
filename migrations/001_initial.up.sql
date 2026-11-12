CREATE SCHEMA access;
CREATE SCHEMA producers;
CREATE SCHEMA harvest;
CREATE TABLE access.organizations(id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE access.users(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES access.organizations,
 email text NOT NULL UNIQUE, password_hash text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','collector','viewer')), active boolean NOT NULL DEFAULT true,
 UNIQUE(id,organization_id)
);
CREATE TABLE access.sessions(
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES access.users,
 csrf_token text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON access.sessions(expires_at);
CREATE TABLE producers.producers(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES access.organizations,
 name varchar(120) NOT NULL CHECK(length(trim(name))>0), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id)
);
CREATE INDEX producers_org ON producers.producers(organization_id,id);
CREATE TABLE producers.parcels(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, producer_id uuid NOT NULL,
 name varchar(120) NOT NULL CHECK(length(trim(name))>0),
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(producer_id,organization_id) REFERENCES producers.producers(id,organization_id)
);
CREATE INDEX parcels_producer ON producers.parcels(producer_id,organization_id);
CREATE TABLE access.parcel_assignments(
 user_id uuid NOT NULL, parcel_id uuid NOT NULL, organization_id uuid NOT NULL,
 PRIMARY KEY(user_id,parcel_id),
 FOREIGN KEY(user_id,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(parcel_id,organization_id) REFERENCES producers.parcels(id,organization_id)
);
CREATE INDEX assignments_parcel ON access.parcel_assignments(parcel_id,organization_id);
CREATE TABLE harvest.harvests(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, parcel_id uuid NOT NULL,
 harvested_at timestamptz NOT NULL, quantity numeric(12,3) NOT NULL CHECK(quantity>0),
 unit text NOT NULL CHECK(unit IN ('kg','unidad')), actor_id uuid NOT NULL,
 UNIQUE(id,organization_id),
 FOREIGN KEY(parcel_id,organization_id) REFERENCES producers.parcels(id,organization_id),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
CREATE INDEX harvests_parcel ON harvest.harvests(parcel_id,organization_id);
CREATE TABLE harvest.pre_lots(
 id uuid PRIMARY KEY, harvest_id uuid NOT NULL UNIQUE, organization_id uuid NOT NULL,
 actor_id uuid NOT NULL, request_key uuid NOT NULL, request_payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'registrado' CHECK(status='registrado'), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(harvest_id,organization_id) REFERENCES harvest.harvests(id,organization_id),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id),
 UNIQUE(actor_id,request_key)
);
CREATE INDEX pre_lots_org ON harvest.pre_lots(organization_id,id);
CREATE TABLE access.audit(
 id uuid PRIMARY KEY, actor_id uuid NOT NULL, organization_id uuid NOT NULL,
 action text NOT NULL, resource_id uuid NOT NULL, result text NOT NULL CHECK(result='accepted'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
CREATE INDEX audit_actor ON access.audit(actor_id,created_at);
