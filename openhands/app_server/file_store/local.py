import os
import shutil
import threading

from pydantic import model_validator

from openhands.app_server.file_store.files import FileStore
from openhands.app_server.utils.logger import openhands_logger as logger

# Minimum free bytes required before a write is attempted.
# 50 MB keeps the OS + event log working even when a sandbox goes rogue.
_MIN_FREE_BYTES: int = 50 * 1024 * 1024


class LocalFileStore(FileStore):
    root: str

    @model_validator(mode='after')
    def _setup_root(self) -> 'LocalFileStore':
        if self.root.startswith('~'):
            self.root = os.path.expanduser(self.root)
        os.makedirs(self.root, exist_ok=True)
        return self

    def get_full_path(self, path: str) -> str:
        if path.startswith('/'):
            path = path[1:]
        return os.path.join(self.root, path)

    def _check_disk_space(self, full_path: str, needed_bytes: int = 0) -> None:
        """Raise OSError if free space on the target partition is below the minimum."""
        stat = shutil.disk_usage(os.path.dirname(full_path) or '.')
        required = max(_MIN_FREE_BYTES, needed_bytes)
        if stat.free < required:
            raise OSError(
                f'Insufficient disk space: {stat.free // 1024} KiB free, '
                f'need at least {required // 1024} KiB '
                f'(path={full_path})'
            )

    def write(self, path: str, contents: str | bytes) -> None:
        full_path = self.get_full_path(path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        mode = 'w' if isinstance(contents, str) else 'wb'

        # Pre-flight: reject writes early if the partition is nearly full.
        content_bytes = len(contents.encode() if isinstance(contents, str) else contents)
        self._check_disk_space(full_path, needed_bytes=content_bytes)

        # Atomic write: temp file → fsync → rename (prevents partial-write corruption)
        temp_path = f'{full_path}.tmp.{os.getpid()}.{threading.get_ident()}'
        try:
            with open(temp_path, mode) as f:
                f.write(contents)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp_path, full_path)
        except OSError as exc:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
            logger.error('Write failed for %s: %s', full_path, exc)
            raise

    def read(self, path: str) -> str:
        full_path = self.get_full_path(path)
        with open(full_path, 'r') as f:
            return f.read()

    def list(self, path: str) -> list[str]:
        full_path = self.get_full_path(path)
        files = [os.path.join(path, f) for f in os.listdir(full_path)]
        files = [f + '/' if os.path.isdir(self.get_full_path(f)) else f for f in files]
        return files

    def delete(self, path: str) -> None:
        try:
            full_path = self.get_full_path(path)
            if not os.path.exists(full_path):
                logger.debug(f'Local path does not exist: {full_path}')
                return
            if os.path.isfile(full_path):
                os.remove(full_path)
                logger.debug(f'Removed local file: {full_path}')
            elif os.path.isdir(full_path):
                shutil.rmtree(full_path)
                logger.debug(f'Removed local directory: {full_path}')
        except Exception as e:
            logger.error(f'Error clearing local file store: {str(e)}')
