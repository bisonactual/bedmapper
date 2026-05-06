use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{broadcast, watch, RwLock};
use tokio_tungstenite::accept_async;

/// WebSocket server state
pub struct WsServer {
    pub port: u16,
    pub bind_address: String,
    pub client_count: Arc<RwLock<usize>>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl WsServer {
    pub fn new() -> Self {
        Self {
            port: 5001,
            bind_address: "127.0.0.1".to_string(),
            client_count: Arc::new(RwLock::new(0)),
            shutdown_tx: None,
        }
    }

    pub async fn start(
        &mut self,
        port: u16,
        bind_address: &str,
        broadcast_rx: broadcast::Receiver<String>,
        last_payload: watch::Receiver<Option<String>>,
    ) -> Result<(), String> {
        let addr = format!("{}:{}", bind_address, port);
        let listener = TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Cannot bind to {}: {}", addr, e))?;

        self.port = port;
        self.bind_address = bind_address.to_string();

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel();
        self.shutdown_tx = Some(shutdown_tx);

        let client_count = self.client_count.clone();

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    accept = listener.accept() => {
                        match accept {
                            Ok((stream, _addr)) => {
                                let mut rx = broadcast_rx.resubscribe();
                                let lp = last_payload.clone();
                                let cc = client_count.clone();

                                tokio::spawn(async move {
                                    let ws = match accept_async(stream).await {
                                        Ok(ws) => ws,
                                        Err(_) => return,
                                    };
                                    let (mut write, _read) = ws.split();

                                    *cc.write().await += 1;

                                    // Send last payload on connect
                                    let cached = lp.borrow().clone();
                                    if let Some(payload) = cached {
                                        let _ = write.send(tokio_tungstenite::tungstenite::Message::Text(payload.into())).await;
                                    }

                                    // Forward broadcasts
                                    loop {
                                        match rx.recv().await {
                                            Ok(msg) => {
                                                if write.send(tokio_tungstenite::tungstenite::Message::Text(msg.into())).await.is_err() {
                                                    break;
                                                }
                                            }
                                            Err(broadcast::error::RecvError::Closed) => break,
                                            Err(broadcast::error::RecvError::Lagged(_)) => continue,
                                        }
                                    }

                                    let mut count = cc.write().await;
                                    *count = count.saturating_sub(1);
                                });
                            }
                            Err(_) => break,
                        }
                    }
                    _ = &mut shutdown_rx => break,
                }
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }

    pub async fn connected_clients(&self) -> usize {
        *self.client_count.read().await
    }
}
