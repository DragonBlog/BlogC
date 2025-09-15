use crate::{
    db::{models, DbConnection, FileDao, LinkDao},
    error::Result,
    md_parser::parse_markdown,
    utils::quick_check_file_changed,
};
use camino::Utf8Path;
use std::{os::macos::fs::MetadataExt, path::Path};
use time::OffsetDateTime;
use tracing::{info, trace, warn};
use urlencoding::decode;


/// 允许处理的文件扩展名列表
/// 包括常见的图片格式、Markdown文档格式
pub static ALLOW_EXTENSIONS: &[&str] = &["jpg", "png", "jpeg", "gif", "svg", "webp", "md", "mdx"];

pub static IMAGE_EXTENSIONS: &[&str] = &["jpg", "png", "jpeg", "gif", "svg", "webp"];

/// 检查目录条目是否应该被处理
///
/// # 参数
/// * `entry` - 要检查的目录条目
///
/// # 返回值
/// 如果条目应该被处理则返回true，否则返回false
fn is_entry_allowed(entry: &ignore::DirEntry) -> bool {
    // 允许所有目录
    if entry.path().is_dir() {
        true
    // 对于文件，检查扩展名是否在允许列表中
    } else if let Some(ext) = entry.path().extension() {
        ALLOW_EXTENSIONS
            .iter()
            .any(|allowed| ext.eq_ignore_ascii_case(allowed))
    } else {
        // 没有扩展名的文件也允许处理
        true
    }
}

/// 构建指定路径下的文件索引
///
/// 此函数会遍历指定路径下的所有文件，将文件信息存储到数据库中，
/// 并解析Markdown文件中的链接，建立文件间的引用关系。
///
/// # 参数
/// * `path` - 要建立索引的根路径
/// * `conn` - 数据库连接
///
/// # 返回值
/// 操作结果，成功时返回Ok(())
pub async fn build_index<P: AsRef<Path>>(path: P, conn: DbConnection) -> Result<()> {
    let file_dao = FileDao::new(conn.clone());
    let link_dao = LinkDao::new(conn);

    // 存储需要处理链接的Markdown文件信息
    let mut md_files_with_info = vec![];

    // 遍历目录中的所有条目
    for entry in ignore::WalkBuilder::new(&path)
        .standard_filters(true)
        .filter_entry(is_entry_allowed)
        .build()
    {
        let entry = entry?;

        // 跳过目录
        if entry.path().is_dir() {
            trace!("Skipping directory: {}", entry.path().display());
            continue;
        }

        trace!("Processing file: {}", entry.path().display());

        // 将路径转换为UTF-8格式
        let file_path = Utf8Path::from_path(entry.path()).ok_or(anyhow::anyhow!(
            "Invalid UTF-8 path: {}",
            entry.path().display()
        ))?;

        // 获取文件元数据
        let metadata = entry.metadata()?;
        let mut hash = [0; 32];
        let modify_time = metadata.st_mtime();

        // 获取文件扩展名，默认为"text"
        let ext = file_path.extension().unwrap_or("text");

        // 如果是Markdown文件，解析其内容并存储链接信息
        if file_path.extension() == Some("md") || file_path.extension() == Some("mdx") {
            if let Some(old_file) = file_dao.find_by_path(file_path.as_str()).await? {
                if old_file.modify_time == modify_time {
                    info!("File not modified, skipping: {}", file_path);
                    continue;
                } else {
                    let (changed, new_hash) = quick_check_file_changed(file_path, hash).await?;
                    if !changed {
                        continue;
                    }
                    hash = new_hash;
                }
            }

            let id = file_dao
                .insert(&models::File {
                    id: 0, // 0表示新记录，由数据库分配ID
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
                    id: 0, // 0表示新记录，由数据库分配ID
                    path: file_path.to_string(),
                    file_type: ext.to_string(),
                    modify_time,
                    indexed_at: OffsetDateTime::now_utc(),
                    hash,
                })
                .await?;
        }
    }

    // 处理Markdown文件中的链接
    for (id, file_path, markdown_info) in md_files_with_info {
        for link in markdown_info.links {
            // 跳过绝对链接和远程链接
            if link.file_path.starts_with("http://") || link.file_path.starts_with("https://") {
                info!(
                    "Skip absolute or remote link: {} in file: {}",
                    link.file_path.display(),
                    file_path
                );
                continue;
            }

            // 解码URL编码的文件路径
            let mut link_file_path =
                Utf8Path::new(&decode(&link.file_path.to_string_lossy())?).to_owned();

            // 如果是相对路径，转换为绝对路径
            if !link_file_path.is_absolute() {
                let parent = file_path.parent().ok_or(anyhow::anyhow!(
                    "File has no parent directory: {}",
                    file_path
                ))?;
                link_file_path = parent.join(link_file_path);
            }

            // 查找链接目标文件在数据库中的ID
            let target_id = file_dao
                .find_by_path(link_file_path.as_str())
                .await?
                .map(|f| f.id);

            info!("Resolved link path: {} {:?}", link_file_path, target_id);

            // 如果目标文件不存在于索引中，记录日志并跳过
            if target_id.is_none() {
                warn!(
                    "Link target not found in index: {} linked from {}",
                    link_file_path, file_path
                );
                continue;
            }

            // 提取链接在源文件中的位置信息
            let position = link.position;
            let start_offset = position.as_ref().map(|position| position.start.offset);
            let end_offset = position.as_ref().map(|position| position.end.offset);

            // 将链接信息插入数据库
            link_dao
                .insert(&models::Link {
                    id: 0, // 0表示新记录，由数据库分配ID
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

#[cfg(test)]
mod tests {
    use tracing::Level;

    use crate::db::init_db;

    use super::*;

    #[tokio::test]
    async fn test_build_index() -> Result<()> {
        tracing_subscriber::fmt::fmt()
            .with_max_level(Level::TRACE)
            .init();
        let db = init_db("index.db").unwrap();
        build_index("test_mdx/principle", db).await?;
        Ok(())
    }
}
