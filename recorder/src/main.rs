use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::time::Duration;
use tracing::{info, warn, error};

mod segment;
mod retention;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize structured logging
    tracing_subscriber::fmt::init();
    info!("Starting mView Sentinel Recording Engine...");

    // 1. Connect to PostgreSQL
    let db_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://sentinel:sentinel@postgres:5432/sentinelnvr".to_string());
    
    info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&db_url)
        .await;

    match pool {
        Ok(_) => info!("Database connection established."),
        Err(e) => warn!("Could not connect to database (is it running?): {}", e),
    }

    // 2. Connect to MQTT (for event-driven retention tagging)
    let mqtt_broker = env::var("MQTT_BROKER").unwrap_or_else(|_| "mqtt".to_string());
    info!("Initializing MQTT connection to {}...", mqtt_broker);
    
    // 3. Start background retention cleanup task
    tokio::spawn(async move {
        retention::run_cleanup_task().await;
    });

    // 4. Main recording loop
    // In production, this polls the database for active cameras
    // and spawns a segment recording task for each one connected to go2rtc
    info!("Engine ready. Waiting for camera stream allocations...");
    
    loop {
        // Here we would use ffmpeg-next to read the RTSP stream from go2rtc 
        // (e.g. rtsp://go2rtc:8554/camera_1_main) and mux the packets directly 
        // into MP4 segments without decoding/encoding.
        
        tokio::time::sleep(Duration::from_secs(60)).await;
        info!("Recorder heartbeat...");
    }
}
