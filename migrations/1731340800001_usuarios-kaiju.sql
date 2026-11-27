-- Up Migration

CREATE TABLE kaiju_usuario (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  correo          text NOT NULL UNIQUE CHECK (correo = lower(correo) AND length(correo) <= 254),
  nombre          text NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 80),
  apellidos       text NOT NULL CHECK (length(trim(apellidos)) BETWEEN 2 AND 80),
  hash_contrasena text NOT NULL CHECK (hash_contrasena LIKE '$argon2id$%'),
  rol             text NOT NULL CHECK (rol IN ('administrador', 'vendedor', 'encargado_inventario')),
  version_sesion  integer NOT NULL DEFAULT 0 CHECK (version_sesion >= 0)
);

-- Down Migration

DROP TABLE kaiju_usuario;
