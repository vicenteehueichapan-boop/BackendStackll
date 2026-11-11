-- Up Migration

-- Esquema inicial de Gas El Volcán. Las reglas del negocio viven aquí (NOT NULL, UNIQUE, CHECK, FK):
-- ningún endpoint puede guardar un dato que las incumpla, aunque el código tenga un error.

CREATE TABLE categoria (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre     text        NOT NULL UNIQUE CHECK (length(trim(nombre)) BETWEEN 3 AND 60),
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE zona_despacho (
  id               text PRIMARY KEY CHECK (id ~ '^[a-z]+$'),
  nombre           text NOT NULL UNIQUE,
  comunas          text NOT NULL,
  dias             text NOT NULL,
  horario          text NOT NULL,
  tiempo_estimado  text NOT NULL
);

-- id público UUIDv7 (PostgreSQL 18): ordenado en el tiempo y no adivinable en una URL.
CREATE TABLE usuario (
  id               uuid        PRIMARY KEY DEFAULT uuidv7(),
  correo           text        NOT NULL UNIQUE CHECK (correo = lower(correo) AND correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre           text        NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 80),
  apellidos        text        NOT NULL CHECK (length(trim(apellidos)) BETWEEN 2 AND 80),
  -- Solo se guarda el hash Argon2id; la contraseña en texto plano nunca llega a la base.
  hash_contrasena  text        NOT NULL CHECK (hash_contrasena LIKE '$argon2id$%'),
  rol              text        NOT NULL CHECK (rol IN ('cliente', 'operadora', 'repartidor', 'administracion')),
  estado           text        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'deshabilitado')),
  -- Se incrementa al cerrar sesión o deshabilitar la cuenta: invalida los JWT ya emitidos.
  version_sesion   integer     NOT NULL DEFAULT 0 CHECK (version_sesion >= 0),
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

-- Datos que solo tienen los clientes (1 a 0..1 con usuario).
CREATE TABLE perfil_cliente (
  usuario_id    uuid PRIMARY KEY REFERENCES usuario (id) ON DELETE CASCADE,
  run           text NOT NULL UNIQUE CHECK (run ~ '^[0-9]{7,8}[0-9K]$'),
  tipo_cliente  text NOT NULL CHECK (tipo_cliente IN ('residencial', 'comercial')),
  direccion     text NOT NULL DEFAULT '' CHECK (length(direccion) <= 200),
  -- NULL: el cliente aún no elige zona preferida (el formulario la deja opcional).
  zona_id       text REFERENCES zona_despacho (id) ON DELETE RESTRICT
);
CREATE INDEX perfil_cliente_zona_idx ON perfil_cliente (zona_id);

CREATE TABLE producto (
  codigo              text        PRIMARY KEY CHECK (codigo ~ '^[A-Z]{2}[0-9]{3}$'),
  nombre              text        NOT NULL CHECK (length(trim(nombre)) BETWEEN 3 AND 100),
  descripcion         text        NOT NULL CHECK (length(descripcion) <= 500),
  unidad              text        NOT NULL,
  -- Una categoría con productos no se puede borrar.
  categoria_id        integer     NOT NULL REFERENCES categoria (id) ON DELETE RESTRICT,
  -- Pesos chilenos: sin decimales, enteros mayores que cero.
  precio_residencial  integer     NOT NULL CHECK (precio_residencial > 0),
  precio_comercial    integer     NOT NULL CHECK (precio_comercial > 0),
  stock               integer     NOT NULL CHECK (stock >= 0),
  destacado           boolean     NOT NULL DEFAULT false,
  -- Un producto con pedidos no se borra: se retira del catálogo.
  estado              text        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'retirado')),
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX producto_categoria_idx ON producto (categoria_id);

CREATE TABLE pedido (
  id                  uuid        PRIMARY KEY DEFAULT uuidv7(),
  -- Número visible para el cliente; el seguimiento exige además el correo.
  numero              integer     GENERATED ALWAYS AS IDENTITY UNIQUE,
  -- NULL: compra de un visitante sin cuenta (RF del ERS).
  usuario_id          uuid        REFERENCES usuario (id) ON DELETE RESTRICT,
  nombre_contacto     text        NOT NULL CHECK (length(trim(nombre_contacto)) BETWEEN 2 AND 80),
  apellidos_contacto  text        NOT NULL CHECK (length(trim(apellidos_contacto)) BETWEEN 2 AND 80),
  correo_contacto     text        NOT NULL CHECK (correo_contacto = lower(correo_contacto)),
  direccion           text        NOT NULL CHECK (length(trim(direccion)) BETWEEN 5 AND 200),
  zona_id             text        NOT NULL REFERENCES zona_despacho (id) ON DELETE RESTRICT,
  tipo_cliente        text        NOT NULL CHECK (tipo_cliente IN ('residencial', 'comercial')),
  total               integer     NOT NULL CHECK (total > 0),
  estado              text        NOT NULL DEFAULT 'pendiente'
                                  CHECK (estado IN ('pendiente', 'asignado', 'en_camino', 'entregado')),
  repartidor_id       uuid        REFERENCES usuario (id) ON DELETE RESTRICT,
  -- Nombre del repartidor al momento de asignar (regla 6 del ERS).
  repartidor_nombre   text,
  cobrado_en          timestamptz,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now(),
  -- Un pedido pendiente no tiene repartidor; desde «asignado» siempre lo tiene.
  CONSTRAINT pedido_repartidor_segun_estado CHECK ((estado = 'pendiente') = (repartidor_id IS NULL)),
  CONSTRAINT pedido_nombre_repartidor CHECK ((repartidor_id IS NULL) = (repartidor_nombre IS NULL)),
  -- El cobro en efectivo se registra exactamente al entregar (RF15).
  CONSTRAINT pedido_cobro_al_entregar CHECK ((estado = 'entregado') = (cobrado_en IS NOT NULL))
);
CREATE INDEX pedido_usuario_idx ON pedido (usuario_id);
CREATE INDEX pedido_repartidor_idx ON pedido (repartidor_id);
CREATE INDEX pedido_zona_idx ON pedido (zona_id);
CREATE INDEX pedido_estado_fecha_idx ON pedido (estado, creado_en);

-- Precio congelado al confirmar: un cambio de tarifa posterior no altera pedidos ya hechos.
CREATE TABLE linea_pedido (
  pedido_id        uuid    NOT NULL REFERENCES pedido (id) ON DELETE CASCADE,
  producto_codigo  text    NOT NULL REFERENCES producto (codigo) ON DELETE RESTRICT,
  cantidad         integer NOT NULL CHECK (cantidad > 0),
  precio_unitario  integer NOT NULL CHECK (precio_unitario > 0),
  PRIMARY KEY (pedido_id, producto_codigo)
);
CREATE INDEX linea_pedido_producto_idx ON linea_pedido (producto_codigo);

CREATE TABLE mensaje_contacto (
  id         uuid        PRIMARY KEY DEFAULT uuidv7(),
  nombre     text        NOT NULL CHECK (length(trim(nombre)) BETWEEN 3 AND 80),
  correo     text        NOT NULL,
  motivo     text        NOT NULL CHECK (motivo IN ('Consulta de productos', 'Cobertura y horarios', 'Estado de un pedido', 'Otro')),
  mensaje    text        NOT NULL CHECK (length(trim(mensaje)) BETWEEN 10 AND 500),
  creado_en  timestamptz NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE mensaje_contacto;
DROP TABLE linea_pedido;
DROP TABLE pedido;
DROP TABLE producto;
DROP TABLE perfil_cliente;
DROP TABLE usuario;
DROP TABLE zona_despacho;
DROP TABLE categoria;
