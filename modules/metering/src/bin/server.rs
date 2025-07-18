use envconfig::Envconfig;
use tokio::signal;

use common_build_info::BuildInfo;
use common_logging::init::init_telemetry;
use metering::config::Config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    match dotenvy::dotenv() {
        Err(error) if error.not_found() => Ok(()),
        Err(error) => Err(error),
        Ok(_) => Ok(()),
    }?;

    let build_info = BuildInfo::set(env!("CARGO_BIN_NAME"));
    println!("Starting {}", build_info);

    let config = Config::init_from_env()?;

    init_telemetry(&config.common.telemetry, env!("CARGO_BIN_NAME"));

    let private_server = metering::server::start_server(config.clone());

    let exit = signal::ctrl_c();

    tokio::select! {
          _ = private_server => {},
        _ = exit => {
              log::info!("Interrupted");
        }
    }

    Ok(())
}
