import React from "react";
import { useSocket } from "../context/SocketContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

const SocketStatus = () => {
  const { socket, isConnected, connectionError, reconnect } = useSocket();

  if (import.meta.env.PROD) {
    return null; // Hide in production
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg p-3 shadow-lg max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm font-medium">Socket Status</span>
        </div>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {socket && (
        <div className="text-xs text-muted-foreground mb-1">
          ID: {socket.id || "No ID"}
        </div>
      )}

      {connectionError && (
        <div className="text-xs text-red-500 mb-2">
          Error: {connectionError}
        </div>
      )}

      {!isConnected && (
        <Button
          size="sm"
          variant="outline"
          onClick={reconnect}
          className="w-full"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      )}
    </div>
  );
};

export default SocketStatus;
