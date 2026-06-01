import { useEffect, useRef, useCallback, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const TOPICS = {
  ORDERS: "/topic/orders",
  ORDER: (id) => `/topic/orders/${id}`,
  PRODUCTS_STOCK: "/topic/stocks/products",
  MATERIALS_STOCK: "/topic/stocks/materials",
  PRODUCTION: "/topic/production",
  SUPPLY_CHAIN: "/topic/supply-chain",
  NOTIFICATIONS: "/topic/notifications",
  RESERVATIONS: "/topic/reservations",
};

export function useOrderWorkflow({ onEvent, watchOrderIds = [] }) {
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const subsRef = useRef([]);

  const dispatch = useCallback((event) => {
    if (typeof onEvent === "function") onEvent(event);
  }, [onEvent]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const sockUrl = `${API_URL}/ws?token=${token}`;

    const client = new Client({
      webSocketFactory: () => new SockJS(sockUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);

        // Global order events
        const s1 = client.subscribe(TOPICS.ORDERS, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });

        // Per-order topics
        const orderSubs = watchOrderIds.map((orderId) =>
          client.subscribe(TOPICS.ORDER(orderId), (msg) => {
            try { dispatch({ ...JSON.parse(msg.body), orderId }); } catch {}
          })
        );

        // Stock events
        const s2 = client.subscribe(TOPICS.PRODUCTS_STOCK, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });
        const s3 = client.subscribe(TOPICS.MATERIALS_STOCK, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });

        // Production events
        const s4 = client.subscribe(TOPICS.PRODUCTION, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });

        // Supply chain events
        const s5 = client.subscribe(TOPICS.SUPPLY_CHAIN, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });

        // Reservations
        const s6 = client.subscribe(TOPICS.RESERVATIONS, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });

        subsRef.current = [s1, ...orderSubs, s2, s3, s4, s5, s6];
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      subsRef.current.forEach((s) => { try { s.unsubscribe(); } catch {} });
      client.deactivate();
    };
    // watchOrderIds is serialized below to avoid re-connecting on reference change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchOrderIds)]);

  return { connected };
}
