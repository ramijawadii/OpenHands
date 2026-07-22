from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path

from pydantic import TypeAdapter

from openhands.core.config.openhands_config import OpenHandsConfig
from openhands.core.logger import openhands_logger as logger
from openhands.storage import get_file_store
from openhands.storage.conversation.conversation_store import ConversationStore
from openhands.storage.data_models.conversation_metadata import ConversationMetadata
from openhands.storage.data_models.conversation_metadata_result_set import (
    ConversationMetadataResultSet,
)
from openhands.storage.files import FileStore
from openhands.storage.locations import (
    CONVERSATION_BASE_DIR,
    get_conversation_metadata_filename,
)
from openhands.utils.async_utils import call_sync_from_async
from openhands.utils.search_utils import offset_to_page_id, page_id_to_offset

conversation_metadata_type_adapter = TypeAdapter(ConversationMetadata)

# Upper bound on concurrent metadata reads during search(); high enough to make
# the load effectively one round-trip, low enough not to exhaust file handles.
_SEARCH_CONCURRENCY = 32


@dataclass
class FileConversationStore(ConversationStore):
    file_store: FileStore

    async def save_metadata(self, metadata: ConversationMetadata) -> None:
        json_str = conversation_metadata_type_adapter.dump_json(metadata)
        path = self.get_conversation_metadata_filename(metadata.conversation_id)
        await call_sync_from_async(self.file_store.write, path, json_str)

    async def get_metadata(self, conversation_id: str) -> ConversationMetadata:
        path = self.get_conversation_metadata_filename(conversation_id)
        json_str = await call_sync_from_async(self.file_store.read, path)

        # Validate the JSON
        json_obj = json.loads(json_str)
        if 'created_at' not in json_obj:
            raise FileNotFoundError(path)

        # Remove github_user_id if it exists
        if 'github_user_id' in json_obj:
            json_obj.pop('github_user_id')

        result = conversation_metadata_type_adapter.validate_python(json_obj)
        return result

    async def delete_metadata(self, conversation_id: str) -> None:
        path = str(
            Path(self.get_conversation_metadata_filename(conversation_id)).parent
        )
        await call_sync_from_async(self.file_store.delete, path)

    async def exists(self, conversation_id: str) -> bool:
        path = self.get_conversation_metadata_filename(conversation_id)
        try:
            await call_sync_from_async(self.file_store.read, path)
            return True
        except FileNotFoundError:
            return False

    async def search(
        self,
        page_id: str | None = None,
        limit: int = 20,
    ) -> ConversationMetadataResultSet:
        conversations: list[ConversationMetadata] = []
        metadata_dir = self.get_conversation_metadata_dir()
        try:
            conversation_ids = [
                Path(path).name
                for path in self.file_store.list(metadata_dir)
                if not Path(path).name.startswith('.')
            ]
        except FileNotFoundError:
            return ConversationMetadataResultSet([])
        num_conversations = len(conversation_ids)
        start = page_id_to_offset(page_id)
        end = min(limit + start, num_conversations)

        # Load every conversation's metadata CONCURRENTLY. Previously this was a
        # sequential `await` per file, so N conversations meant N serial I/O
        # round-trips — the cause of the slow history load. A bounded semaphore
        # keeps us from opening an unbounded number of file handles at once.
        # Pagination semantics are unchanged: we still load all, sort, then slice
        # by the total-id count so page boundaries stay stable.
        sem = asyncio.Semaphore(_SEARCH_CONCURRENCY)

        async def _load(cid: str) -> ConversationMetadata | None:
            async with sem:
                try:
                    return await self.get_metadata(cid)
                except Exception:
                    logger.warning(
                        f'Could not load conversation metadata: {cid}'
                    )
                    return None

        loaded = await asyncio.gather(
            *(_load(cid) for cid in conversation_ids)
        )
        conversations = [c for c in loaded if c is not None]
        conversations.sort(key=_sort_key, reverse=True)
        conversations = conversations[start:end]
        next_page_id = offset_to_page_id(end, end < num_conversations)
        return ConversationMetadataResultSet(conversations, next_page_id)

    def get_conversation_metadata_dir(self) -> str:
        return CONVERSATION_BASE_DIR

    def get_conversation_metadata_filename(self, conversation_id: str) -> str:
        return get_conversation_metadata_filename(conversation_id)

    @classmethod
    async def get_instance(
        cls, config: OpenHandsConfig, user_id: str | None
    ) -> FileConversationStore:
        file_store = get_file_store(
            file_store_type=config.file_store,
            file_store_path=config.file_store_path,
            file_store_web_hook_url=config.file_store_web_hook_url,
            file_store_web_hook_headers=config.file_store_web_hook_headers,
            file_store_web_hook_batch=config.file_store_web_hook_batch,
        )
        return FileConversationStore(file_store)


def _sort_key(conversation: ConversationMetadata) -> str:
    created_at = conversation.created_at
    if created_at:
        return created_at.isoformat()  # YYYY-MM-DDTHH:MM:SS for sorting
    return ''
