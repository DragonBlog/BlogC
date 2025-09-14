use notify::{Event, RecommendedWatcher, Watcher};
use tokio::sync::mpsc;

use crate::error::Result;

pub async fn async_watcher() -> Result<(RecommendedWatcher, mpsc::Receiver<Result<Event>>)> {
    let (tx, rx) = mpsc::channel::<Result<Event>>(10);
    let watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            let tx = tx.clone();
            tx.try_send(res.map_err(|e| e.into())).ok();
        },
        notify::Config::default(),
    )?;

    Ok((watcher, rx))
}
