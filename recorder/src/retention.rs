use std::time::Duration;
use tracing::{info, debug};

/// Background task that continuously monitors disk space and segment age
/// to enforce retention policies (e.g., delete 30-day old video, or oldest video when disk is 95% full).
pub async fn run_cleanup_task() {
    info!("Retention cleanup task started.");
    
    loop {
        debug!("Checking retention policies...");
        
        // 1. Check disk space on /recordings mount
        // If > 95% full, find oldest segments in DB and delete files
        
        // 2. Enforce age-based retention
        // e.g. Delete segments where end_time < (NOW - 30 days) AND has_events == false
        
        // 3. Delete segments where end_time < (NOW - 90 days) AND has_events == true
        
        // Sleep for 1 hour before next check
        tokio::time::sleep(Duration::from_secs(3600)).await;
    }
}
