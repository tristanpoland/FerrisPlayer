[package]
name = "ferris-player"
version = "0.1.0"
edition = "2021"

[dependencies]
rocket = { version = "0.5.0", features = ["json"] }
rocket_cors = "0.6.0"
sqlx = { version = "0.7.3", features = ["runtime-tokio", "sqlite", "chrono", "uuid"] }
tokio = { version = "1.35.0", features = ["full"] }
serde = { version = "1.0.193", features = ["derive"] }
serde_json = "1.0.108"
dotenvy = "0.15.7"
tracing = "0.1.40"
tracing-subscriber = "0.3.18"
reqwest = { version = "0.11.23", features = ["json"] }
chrono = { version = "0.4.31", features = ["serde"] }
uuid = { version = "1.6.1", features = ["v4", "serde"] }
sha2 = "0.10.8"
tokio-util = { version = "0.7.10", features = ["io"] }
futures = "0.3.29"
async-stream = "0.3.5"
bytes = "1.5.0"
thiserror = "1.0.51"
walkdir = "2.4.0"