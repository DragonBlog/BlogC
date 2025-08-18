use std::path::Path;

use crate::{error::Result, git::Git, utils::check_directory_is_empty};
use serde::{Deserialize, Serialize};

type OnProgress = tauri::ipc::Channel<Progress>;

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
        git.add_remote("template", "https://github.com/DragonBlog/DragonBlog.git")?;
        tokio::fs::create_dir_all(path.join("blogs")).await?;
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
        git.copy_branch_to_dir("template-main", "template")?;
    } else {
        return Err(anyhow::anyhow!("目录不为空").into());
    }
    Ok(())
}
