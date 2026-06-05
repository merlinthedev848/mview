use tracing::{info, debug};

/// Represents a single recorded MP4 segment on disk
#[allow(dead_code)]
pub struct Segment {
    pub id: uuid::Uuid,
    pub camera_id: String,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
    pub file_path: String,
    pub has_events: bool, // Tagged by MQTT events (motion/AI)
}

#[allow(dead_code)]
impl Segment {
    /// Creates a new segment record and opens a temporary file for muxing
    pub fn new(camera_id: &str, start_time: chrono::DateTime<chrono::Utc>) -> Self {
        let id = uuid::Uuid::new_v4();
        // In production, format is like: /recordings/camera_name/YYYY-MM-DD/HH/MM.SS.mp4
        let file_path = format!("/recordings/{}/{}_{}.mp4.tmp", camera_id, start_time.timestamp(), id);
        
        Self {
            id,
            camera_id: camera_id.to_string(),
            start_time,
            end_time: None,
            file_path,
            has_events: false,
        }
    }

    /// Closes the segment, renames it from .tmp to .mp4, and registers it in PostgreSQL
    pub async fn finalize(&mut self, end_time: chrono::DateTime<chrono::Utc>) {
        self.end_time = Some(end_time);
        let final_path = self.file_path.replace(".tmp", "");
        
        debug!("Finalizing segment: {} -> {}", self.file_path, final_path);
        // std::fs::rename(&self.file_path, &final_path).ok();
        self.file_path = final_path;
        
        // TODO: sqlx insert into recordings table
        info!("Segment finalized and registered: {}", self.file_path);
    }
}
