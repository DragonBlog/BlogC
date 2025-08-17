use std::path::Path;

pub fn check_path_exists<P: AsRef<Path>>(path: P) -> bool {
    path.as_ref().exists()
}

pub fn check_directory_is_empty<P: AsRef<Path>>(path: P) -> bool {
    if let Ok(entries) = std::fs::read_dir(path) {
        entries.count() == 0
    } else {
        false
    }
}
