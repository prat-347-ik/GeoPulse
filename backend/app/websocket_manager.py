"""
WebSocket Connection Manager
Handles active WebSocket connections and broadcasts new events to connected clients
"""

import json
import logging
from typing import List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and broadcasts events in real-time"""

    def __init__(self):
        # Set of active WebSocket connections
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accept a WebSocket connection and add to active connections"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"✅ WebSocket connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection from active connections"""
        self.active_connections.remove(websocket)
        logger.info(f"✅ WebSocket disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """
        Broadcast a message to all active WebSocket connections
        
        Args:
            message (dict): Data to broadcast (typically a new event)
        """
        if not self.active_connections:
            logger.debug("No active WebSocket connections to broadcast to")
            return

        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send WebSocket message: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast_event(self, event: dict):
        """
        Broadcast a new event to all connected clients
        
        Args:
            event (dict): Event object to broadcast
        """
        message = {
            "type": "new_event",
            "event": event,
        }
        await self.broadcast(message)

    async def broadcast_validation(self, event: dict):
        """
        Broadcast validation updates for an event so clients can update hit-rate in real-time.
        """
        message = {
            "type": "validation_update",
            "event": event,
            "validation_summary": event.get("validation_summary", {}),
        }
        await self.broadcast(message)

    async def send_connection_status(self, websocket: WebSocket, status: str = "connected"):
        """Send connection status to a specific client"""
        try:
            message = {
                "type": "status",
                "message": f"Connected to GeoPulse event stream. {len(self.active_connections)} client(s) online.",
                "status": status,
                "activeConnections": len(self.active_connections),
            }
            await websocket.send_json(message)
        except Exception as e:
            logger.warning(f"Failed to send status message: {e}")


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
