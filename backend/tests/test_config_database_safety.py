from pathlib import Path

import pytest

from app.core.config import _normalize_database_url, _validate_production_database_url


def test_normalize_database_url_resolves_relative_sqlite_against_backend_dir(tmp_path: Path):
    backend_dir = tmp_path / "backend"
    backend_dir.mkdir()

    normalized = _normalize_database_url("sqlite:///./code_adventure.db", base_dir=backend_dir)

    assert normalized == f"sqlite:///{(backend_dir / 'code_adventure.db').resolve().as_posix()}"


def test_production_rejects_sqlite_database_inside_backend_dir(tmp_path: Path):
    backend_dir = tmp_path / "backend"
    backend_dir.mkdir()
    db_url = f"sqlite:///{(backend_dir / 'code_adventure.db').resolve().as_posix()}"

    with pytest.raises(RuntimeError, match="outside the backend deploy directory"):
        _validate_production_database_url(db_url, "production", backend_dir=backend_dir)


def test_production_allows_sqlite_database_outside_backend_dir(tmp_path: Path):
    backend_dir = tmp_path / "backend"
    data_dir = tmp_path / "data"
    backend_dir.mkdir()
    data_dir.mkdir()
    db_url = f"sqlite:///{(data_dir / 'code_adventure.db').resolve().as_posix()}"

    _validate_production_database_url(db_url, "production", backend_dir=backend_dir)
