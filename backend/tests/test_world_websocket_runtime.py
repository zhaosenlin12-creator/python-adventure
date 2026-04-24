import asyncio
import time

from app.api.v1 import world as world_api
from app.api.v1.world import _broadcast_world_event
from app.services.world_manager import world_manager


class DisconnectingSocket:
    def __init__(self, user_id: int):
        self.user_id = user_id

    async def send_json(self, _message):
        world_manager.active_connections.pop(self.user_id, None)
        raise RuntimeError("socket already closed")


class SlowSocket:
    async def send_json(self, _message):
        await asyncio.sleep(0.05)


class RecordingSocket:
    def __init__(self):
        self.messages = []

    async def send_json(self, message):
        self.messages.append(message)


def test_world_broadcast_ignores_stale_disconnect_cleanup():
    original_connections = world_manager.active_connections
    original_map_areas = world_manager.map_areas

    try:
        world_manager.active_connections = {698: DisconnectingSocket(698)}
        world_manager.map_areas = {"开放世界": {698}}

        asyncio.run(_broadcast_world_event("开放世界", {"type": "player_move"}))

        assert 698 not in world_manager.active_connections
        assert 698 not in world_manager.map_areas["开放世界"]
    finally:
        world_manager.active_connections = original_connections
        world_manager.map_areas = original_map_areas


def test_world_broadcast_times_out_slow_socket_without_blocking_others(monkeypatch):
    original_connections = world_manager.active_connections
    original_map_areas = world_manager.map_areas
    fast_socket = RecordingSocket()

    try:
        monkeypatch.setattr(world_api, "WORLD_SEND_TIMEOUT_SECONDS", 0.01)
        world_manager.active_connections = {
            701: SlowSocket(),
            702: fast_socket,
        }
        world_manager.map_areas = {"开放世界": {701, 702}}

        started_at = time.perf_counter()
        asyncio.run(_broadcast_world_event("开放世界", {"type": "player_move"}))
        elapsed = time.perf_counter() - started_at

        assert elapsed < 0.04
        assert 701 not in world_manager.active_connections
        assert 701 not in world_manager.map_areas["开放世界"]
        assert fast_socket.messages == [{"type": "player_move"}]
    finally:
        world_manager.active_connections = original_connections
        world_manager.map_areas = original_map_areas
