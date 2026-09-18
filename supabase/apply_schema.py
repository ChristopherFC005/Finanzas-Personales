#!/usr/bin/env python3
"""Aplica el esquema de FinanZen a Supabase (PostgreSQL) desde Python.

Lee los archivos SQL versionados y los ejecuta en orden:
    1. migrations/*.sql   (tablas, enums, indices, triggers)
    2. policies/*.sql     (Row Level Security)
    3. seed/*.sql         (categorias por defecto)

Cada archivo corre dentro de UNA transaccion (si falla, no queda nada a medias)
y se registra en public.schema_migrations con su checksum, asi que volver a
ejecutar el script solo aplica lo que falta.

Uso (desde la raiz del repo):
    pip install -r supabase/requirements.txt
    python supabase/apply_schema.py --dry-run     # solo muestra que se aplicaria
    python supabase/apply_schema.py               # aplica

Conexion: variable DIRECT_URL (recomendada, Session pooler puerto 5432) o
DATABASE_URL, tomada del entorno o de apps/api/.env. Si la contrasena tiene
caracteres especiales (@ : / #) debe ir codificada en la URL.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from dotenv import load_dotenv

SUPABASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = SUPABASE_DIR.parent
SQL_GROUPS = ("migrations", "policies", "seed")


def load_connection_url() -> str:
    load_dotenv(REPO_ROOT / "apps" / "api" / ".env")
    url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    if not url:
        sys.exit("Falta DIRECT_URL (o DATABASE_URL). Definela en apps/api/.env o en el entorno.")

    # libpq no acepta parametros propios de Prisma como ?pgbouncer=true
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k not in {"pgbouncer", "connection_limit", "schema"}]
    return urlunsplit(parts._replace(query=urlencode(query)))


def collect_files() -> list[Path]:
    files: list[Path] = []
    for group in SQL_GROUPS:
        files.extend(sorted((SUPABASE_DIR / group).glob("*.sql")))
    return files


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def label(path: Path) -> str:
    return path.relative_to(SUPABASE_DIR).as_posix()


def main() -> None:
    parser = argparse.ArgumentParser(description="Aplica el esquema SQL de FinanZen a Supabase.")
    parser.add_argument("--dry-run", action="store_true", help="Muestra que se aplicaria sin ejecutar nada.")
    args = parser.parse_args()

    files = collect_files()
    if not files:
        sys.exit("No se encontraron archivos .sql en supabase/.")

    try:
        conn = psycopg.connect(load_connection_url(), autocommit=True)
    except psycopg.OperationalError as exc:
        sys.exit(f"No se pudo conectar a la base de datos. Revisa DIRECT_URL y la contrasena.\n{exc}")

    with conn:
        conn.execute(
            """
            create table if not exists public.schema_migrations (
                filename   text primary key,
                checksum   text not null,
                applied_at timestamptz not null default now()
            )
            """
        )
        # La tabla de control no debe ser accesible por la API publica de Supabase.
        conn.execute("alter table public.schema_migrations enable row level security")

        applied = dict(conn.execute("select filename, checksum from public.schema_migrations").fetchall())

        pending = 0
        for path in files:
            name = label(path)
            digest = checksum(path)

            if name in applied:
                status = "ya aplicado" if applied[name] == digest else "YA APLICADO pero el archivo cambio"
                print(f"  =  {name}  ({status})")
                continue

            pending += 1
            if args.dry_run:
                print(f"  +  {name}  (se aplicaria)")
                continue

            print(f"  +  {name}  aplicando...", end=" ", flush=True)
            try:
                with conn.transaction():
                    conn.execute(path.read_text(encoding="utf-8"))
                    conn.execute(
                        "insert into public.schema_migrations (filename, checksum) values (%s, %s)",
                        (name, digest),
                    )
            except psycopg.Error as exc:
                print("ERROR")
                sys.exit(f"\nFallo en {name}; se hizo rollback de ese archivo.\n{exc}")
            print("OK")

    if args.dry_run:
        print(f"\nDry run: {pending} archivo(s) pendiente(s).")
    else:
        print(f"\nListo: {pending} archivo(s) aplicado(s).")


if __name__ == "__main__":
    main()
