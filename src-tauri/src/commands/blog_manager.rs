use std::{collections::HashMap, path::Path};

use crate::{
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
#[tauri::command]
pub async fn init_blog(path: &str, on_progress: OnProgress) -> Result<()> {
    let path = Path::new(path);

    if !path.exists() {
        tokio::fs::create_dir_all(path).await?;
    }

    if check_directory_is_empty(path) {
        let git = Git::init(path)?;
        git.add_remote(
            "template",
            "https://github.com/yexiyue/ratatui-kit-website.git",
        )?;
        tokio::fs::create_dir_all(path.join(".github/workflows")).await?;
        git.add_all()?;
        let user_info = git.get_user_info()?;
        git.commit("init", user_info)?;
        git.fetch_remote(
            "template",
            Some(|progress: &git2::Progress| {
                on_progress.send(transfer_progress(progress)).ok();
            }),
        )?;
        git.checkout_remote_branch("template-main", "template", "main")?;
        git.checkout_branch("main")?;
        git.copy_branch_to_dir("template-main", TEMPLATE_DIR)?;
        let blog_build_config_path = path.join(TEMPLATE_DIR).join("dragon.json");
        let str = fs::read_to_string(&blog_build_config_path).await?;
        let mut build_config = serde_json::from_str::<BlogBuildConfig>(&str)?;

        for (name, item) in build_config.entries.iter_mut() {
            item.entry_base = format!("../{name}");
            fs::create_dir(path.join(&name)).await?;
        }

        // 覆盖写入配置文件
        fs::write(
            &blog_build_config_path,
            serde_json::to_string_pretty(&build_config)?,
        )
        .await?;
    } else {
        return Err(anyhow::anyhow!("目录不为空").into());
    }

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
