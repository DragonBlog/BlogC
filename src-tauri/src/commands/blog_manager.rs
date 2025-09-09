use std::{collections::HashMap, path::Path};

use crate::{
    blog_manager::BlogManager,
    config::BlogBuildConfig,
    error::Result,
    git::Git,
    utils::{self, check_directory_is_empty},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::fs;

type OnProgress = tauri::ipc::Channel<Progress>;

static TEMPLATE_DIR: &str = "template";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type", content = "data")]
pub enum Progress {
    // 接受
    Receiving(f64, usize),
    // 处理差异
    Processing(f64),
    Finished,
}

fn transfer_progress(progress: &git2::Progress) -> Progress {
    // 只有当总对象数大于0时才显示进度（避免除零错误）
    if progress.total_objects() > 0 {
        // 计算接收对象的百分比
        let percent =
            (progress.received_objects() as f64 / progress.total_objects() as f64) * 100.0;

        return Progress::Receiving(percent, progress.received_bytes());
    }

    // 如果存在差异需要处理，则显示差异处理进度
    if progress.total_deltas() > 0 {
        // 计算处理差异的百分比
        let percent = (progress.indexed_deltas() as f64 / progress.total_deltas() as f64) * 100.0;

        return Progress::Processing(percent);
    }
    Progress::Finished
}

/// 初始化博客目录结构
/// path: 博客目录路径(不存在则创建，如果目录已存在且不为空则报错)
/// returns: 是否需要安装模板
#[tauri::command]
pub async fn init_or_open_blog(path: &str) -> Result<bool> {
    let path = Path::new(path);

    if !path.exists() {
        tokio::fs::create_dir_all(path).await?;
    }

    let blog_manager = if check_directory_is_empty(path) {
        BlogManager::init(path, None)?
    } else {
        BlogManager::open(path)?
    };

    Ok(blog_manager.should_install_template())
}

#[tauri::command]
pub async fn install_template(path: &str, on_progress: OnProgress) -> Result<()> {
    let blog_manager = BlogManager::open(path)?;

    blog_manager.install_template(Some(|progress: &git2::Progress| {
        on_progress.send(transfer_progress(progress)).ok();
    }))?;

    on_progress.send(Progress::Finished)?;

    Ok(())
}

#[tauri::command]
pub async fn read_schemas(project_dir: String) -> Result<HashMap<String, Value>> {
    let path = Path::new(&project_dir)
        .join(TEMPLATE_DIR)
        .join(".astro/collections");
    utils::read_schema_file(path).await
}

#[tauri::command]
pub async fn read_blog_build_config(project_dir: String) -> Result<BlogBuildConfig> {
    let path = Path::new(&project_dir)
        .join(TEMPLATE_DIR)
        .join("dragon.json");
    let str = fs::read_to_string(path).await?;
    Ok(serde_json::from_str(&str)?)
}
