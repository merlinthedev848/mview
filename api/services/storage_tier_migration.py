import os
import shutil
import logging
from datetime import datetime, timedelta

logger = logging.getLogger("mView-StorageMigration")

class StorageTierMigration:
    """
    Moves older video recordings from HOT storage (e.g., NVMe/SSD) 
    to COLD storage (e.g., HDD/NAS) automatically to save expensive disk space.
    """
    def __init__(self):
        self.hot_storage_dir = os.getenv("HOT_STORAGE_PATH", "/mnt/storage/mview/recordings")
        self.cold_storage_dir = os.getenv("COLD_STORAGE_PATH", "/mnt/archive/mview/recordings")
        self.migrate_after_days = int(os.getenv("MIGRATE_AFTER_DAYS", "3"))

    def run_migration(self):
        """Scan hot storage and move files older than threshold to cold storage."""
        if not os.path.exists(self.cold_storage_dir):
            try:
                os.makedirs(self.cold_storage_dir, exist_ok=True)
            except Exception as e:
                logger.error(f"Cold storage not accessible: {e}")
                return

        cutoff_time = datetime.now() - timedelta(days=self.migrate_after_days)
        files_migrated = 0
        bytes_migrated = 0

        for root, _, files in os.walk(self.hot_storage_dir):
            for file in files:
                if not file.endswith(".mp4"):
                    continue
                    
                file_path = os.path.join(root, file)
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))

                if file_time < cutoff_time:
                    # Maintain directory structure
                    rel_path = os.path.relpath(root, self.hot_storage_dir)
                    dest_dir = os.path.join(self.cold_storage_dir, rel_path)
                    os.makedirs(dest_dir, exist_ok=True)
                    
                    dest_path = os.path.join(dest_dir, file)
                    try:
                        file_size = os.path.getsize(file_path)
                        shutil.move(file_path, dest_path)
                        files_migrated += 1
                        bytes_migrated += file_size
                        logger.debug(f"Migrated {file} to cold storage.")
                    except Exception as e:
                        logger.error(f"Failed to migrate {file}: {e}")

        if files_migrated > 0:
            logger.info(f"Storage Migration Complete: Moved {files_migrated} segments ({round(bytes_migrated / (1024**3), 2)} GB) to cold storage.")

storage_migration_service = StorageTierMigration()
