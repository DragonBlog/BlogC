use crate::{
    db::{models, DbConnection, FileDao, LinkDao},
    error::Result,
    md_parser::parse_markdown,
    utils::quick_check_file_changed,
};
use camino::Utf8Path;
use std::path::Path;
use std::time::UNIX_EPOCH; // 用于跨平台时间戳
use time::OffsetDateTime;
use tracing::{info, trace, warn};
use urlencoding::decode;

/// 允许处理的文件扩展名列表
pub static ALLOW_EXTENSIONS: &[&str] = &["jpg", "png", "jpeg", "gif", "svg", "webp", "md", "mdx"];
pub static IMAGE_EXTENSIONS: &[&str] = &["jpg", "png", "jpeg", "gif", "svg", "webp"];

fn is_entry_allowed(entry: &ignore::DirEntry) -> bool {
    if entry.path().is_dir() {
        true
    } else if let Some(ext) = entry.path().extension() {
        ALLOW_EXTENSIONS
            .iter()
            .any(|allowed| ext.eq_ignore_ascii_case(allowed))
    } else {
        true
    }
}

pub async fn build_index<P: AsRef<Path>>(path: P, conn: DbConnection) -> Result<()> {
    let file_dao = FileDao::new(conn.clone());
    let link_dao = LinkDao::new(conn);

    let mut md_files_with_info = vec![];

    for entry in ignore::WalkBuilder::new(&path)
        .standard_filters(true)
        .filter_entry(is_entry_allowed)
        .build()
    {
        let entry = entry?;

        if entry.path().is_dir() {
            trace!("Skipping directory: {}", entry.path().display());
            continue;
        }

        trace!("Processing file: {}", entry.path().display());

        let file_path = Utf8Path::from_path(entry.path()).ok_or(anyhow::anyhow!(
            "Invalid UTF-8 path: {}",
            entry.path().display()
        ))?;

        let metadata = entry.metadata()?;

        //  跨平台获取修改时间（Unix 时间戳秒）
        let modify_time = metadata
            .modified()
            .map_err(|e| anyhow::anyhow!("Failed to get modified time: {}", e))?
            .duration_since(UNIX_EPOCH)
            .map_err(|_| anyhow::anyhow!("SystemTime before UNIX EPOCH"))?
            .as_secs() as i64;

        let mut hash = [0; 32];
        let ext = file_path.extension().unwrap_or("text");

        if file_path.extension() == Some("md") || file_path.extension() == Some("mdx") {
            if let Some(old_file) = file_dao.find_by_path(file_path.as_str()).await? {
                if old_file.modify_time == modify_time {
                    info!("File not modified, skipping: {}", file_path);
                    continue;
                } else {
                    // ✅ 修复：传入旧文件的 hash，而不是 [0;32]
                    let (changed, new_hash) = quick_check_file_changed(file_path, old_file.hash).await?;
                    if !changed {
                        continue;
                    }
                    hash = new_hash;
                }
            }

            let id = file_dao
                .insert(&models::File {
                    id: 0,
                    path: file_path.to_string(),
                    file_type: ext.to_string(),
                    modify_time,
                    indexed_at: OffsetDateTime::now_utc(),
                    hash,
                })
                .await?;

            let markdown_info = parse_markdown(file_path)?;
            md_files_with_info.push((id, file_path.to_path_buf(), markdown_info));
        } else {
            file_dao
                .insert(&models::File {
                    id: 0,
                    path: file_path.to_string(),
                    file_type: ext.to_string(),
                    modify_time,
                    indexed_at: OffsetDateTime::now_utc(),
                    hash,
                })
                .await?;
        }
    }

    // 处理链接部分（保持不变，逻辑没问题）
    for (id, file_path, markdown_info) in md_files_with_info {
        for link in markdown_info.links {
            if link.file_path.starts_with("http://") || link.file_path.starts_with("https://") {
                info!(
                    "Skip absolute or remote link: {} in file: {}",
                    link.file_path.display(),
                    file_path
                );
                continue;
            }

            let mut link_file_path =
                Utf8Path::new(&decode(&link.file_path.to_string_lossy())?).to_owned();

            if !link_file_path.is_absolute() {
                let parent = file_path.parent().ok_or(anyhow::anyhow!(
                    "File has no parent directory: {}",
                    file_path
                ))?;
                link_file_path = parent.join(link_file_path);
            }

            let target_id = file_dao
                .find_by_path(link_file_path.as_str())
                .await?
                .map(|f| f.id);

            info!("Resolved link path: {} {:?}", link_file_path, target_id);

            if target_id.is_none() {
                warn!(
                    "Link target not found in index: {} linked from {}",
                    link_file_path, file_path
                );
                continue;
            }

            let position = link.position;
            let start_offset = position.as_ref().map(|position| position.start.offset);
            let end_offset = position.as_ref().map(|position| position.end.offset);

            link_dao
                .insert(&models::Link {
                    id: 0,
                    source_id: id,
                    target_id: target_id.unwrap(),
                    position,
                    start_offset,
                    end_offset,
                    created_at: OffsetDateTime::now_utc(),
                })
                .await?;
        }
    }

    Ok(())
}