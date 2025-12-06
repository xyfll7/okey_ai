use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InputData {
    pub input_time_stamp: String,
    pub input_text: String,
    pub response_text: Option<String>,
}
