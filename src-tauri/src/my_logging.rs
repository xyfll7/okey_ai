use log::{Level, Metadata};

/// Custom log filter function to handle specific logging rules
pub fn log_filter(metadata: &Metadata) -> bool {
    if metadata.target() == "tao::platform_impl::platform::event_loop::runner" {
        metadata.level() <= Level::Error
    } else {
        metadata.level() <= Level::Info
    }
}
