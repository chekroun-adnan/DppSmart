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
    let activated = false;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws`),
      connectHeaders: { token: localStorage.getItem("accessToken") || "" },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);

        const s1 = client.subscribe(TOPICS.ORDERS, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });

        const orderSubs = watchOrderIds.map((orderId) =>
          client.subscribe(TOPICS.ORDER(orderId), (msg) => {
            try { dispatch({ ...JSON.parse(msg.body), orderId }); } catch {}
          })
        );

        const s2 = client.subscribe(TOPICS.PRODUCTS_STOCK, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });
        const s3 = client.subscribe(TOPICS.MATERIALS_STOCK, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });
        const s4 = client.subscribe(TOPICS.PRODUCTION, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });
        const s5 = client.subscribe(TOPICS.SUPPLY_CHAIN, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });
        const s6 = client.subscribe(TOPICS.RESERVATIONS, (msg) => {
          try { dispatch(JSON.parse(msg.body)); } catch {}
        });

        subsRef.current = [s1, ...orderSubs, s2, s3, s4, s5, s6];
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    clientRef.current = client;

    // Delay activation so React Strict Mode's synchronous cleanup fires before
    // the WebSocket enters CONNECTING state, preventing the "closed before
    // connection established" browser error.
    const timer = setTimeout(() => {
      activated = true;
      client.activate();
    }, 100);

    return () => {
      clearTimeout(timer);
      subsRef.current.forEach((s) => { try { s.unsubscribe(); } catch {} });
      if (activated) client.deactivate();
      clientRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchOrderIds)]);

  return { connected };
}
