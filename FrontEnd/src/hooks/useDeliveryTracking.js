import { useEffect, useState, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export function useDeliveryTracking(orderId) {
  const [livePosition, setLivePosition] = useState(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!orderId) {
      setLivePosition(null);
      return;
    }

    let activated = false;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws`),
      connectHeaders: { token: localStorage.getItem("accessToken") || "" },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/tracking/${orderId}`, (message) => {
          try {
            const data = JSON.parse(message.body);
            if (data.currentLatitude && data.currentLongitude) {
              setLivePosition({
                lat: data.currentLatitude,
                lng: data.currentLongitude,
                status: data.currentStatus,
                estimatedArrival: data.estimatedArrival,
              });
            }
          } catch {}
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    clientRef.current = client;

    const timer = setTimeout(() => {
      activated = true;
      client.activate();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (activated) client.deactivate();
      clientRef.current = null;
      setConnected(false);
      setLivePosition(null);
    };
  }, [orderId]);

  return { livePosition, connected };
}
