-- An empty restore/bootstrap target has only the default public schema and
-- PostgreSQL system objects. Public extension-owned objects are not exempted.
-- PostgreSQL reserves OIDs below FirstNormalObjectId (16384) for built-in
-- objects. User objects in a system namespace must also be inspected.
WITH object_namespaces AS (
  SELECT oid,nspname,nspname IN ('pg_catalog','information_schema','pg_toast') AS is_system
  FROM pg_namespace WHERE nspname !~ '^pg_(toast_)?temp_[0-9]+$'
), namespace_objects AS (
  SELECT c.oid AS object_oid,'pg_class'::regclass AS catalog_oid,n.is_system,
    CASE WHEN c.relkind IN ('r','p') AND n.nspname='public' THEN c.relname
      ELSE 'relation:'||n.nspname||'.'||c.relname END AS object_name
  FROM pg_class c JOIN object_namespaces n ON n.oid=c.relnamespace
  UNION ALL SELECT p.oid,'pg_proc'::regclass,n.is_system,'routine:'||n.nspname||'.'||p.proname FROM pg_proc p JOIN object_namespaces n ON n.oid=p.pronamespace
  UNION ALL SELECT t.oid,'pg_type'::regclass,n.is_system,'type:'||n.nspname||'.'||t.typname FROM pg_type t JOIN object_namespaces n ON n.oid=t.typnamespace
  UNION ALL SELECT o.oid,'pg_operator'::regclass,n.is_system,'operator:'||n.nspname||'.'||o.oprname FROM pg_operator o JOIN object_namespaces n ON n.oid=o.oprnamespace
  UNION ALL SELECT c.oid,'pg_collation'::regclass,n.is_system,'collation:'||n.nspname||'.'||c.collname FROM pg_collation c JOIN object_namespaces n ON n.oid=c.collnamespace
  UNION ALL SELECT c.oid,'pg_conversion'::regclass,n.is_system,'conversion:'||n.nspname||'.'||c.conname FROM pg_conversion c JOIN object_namespaces n ON n.oid=c.connamespace
  UNION ALL SELECT c.oid,'pg_ts_config'::regclass,n.is_system,'search-config:'||n.nspname||'.'||c.cfgname FROM pg_ts_config c JOIN object_namespaces n ON n.oid=c.cfgnamespace
  UNION ALL SELECT d.oid,'pg_ts_dict'::regclass,n.is_system,'search-dictionary:'||n.nspname||'.'||d.dictname FROM pg_ts_dict d JOIN object_namespaces n ON n.oid=d.dictnamespace
  UNION ALL SELECT p.oid,'pg_ts_parser'::regclass,n.is_system,'search-parser:'||n.nspname||'.'||p.prsname FROM pg_ts_parser p JOIN object_namespaces n ON n.oid=p.prsnamespace
  UNION ALL SELECT t.oid,'pg_ts_template'::regclass,n.is_system,'search-template:'||n.nspname||'.'||t.tmplname FROM pg_ts_template t JOIN object_namespaces n ON n.oid=t.tmplnamespace
)
SELECT object_name FROM namespace_objects o
WHERE NOT o.is_system OR (o.object_oid>=16384 AND NOT EXISTS (
  SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
  JOIN object_namespaces n ON n.oid=e.extnamespace
  WHERE d.classid=o.catalog_oid AND d.objid=o.object_oid
    AND d.refclassid='pg_extension'::regclass AND d.deptype='e' AND n.is_system
))
UNION ALL SELECT 'schema:'||nspname FROM object_namespaces WHERE NOT is_system AND nspname<>'public'
UNION ALL SELECT 'extension:'||e.extname FROM pg_extension e JOIN object_namespaces n ON n.oid=e.extnamespace WHERE NOT n.is_system OR e.extname<>'plpgsql'
UNION ALL SELECT 'event-trigger:'||evtname FROM pg_event_trigger
UNION ALL SELECT 'large-object:'||oid::text FROM pg_largeobject_metadata
ORDER BY object_name;
