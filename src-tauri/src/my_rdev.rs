use rdev::{listen, Button, Event, EventType, Key};
use std::thread;
use std::time::SystemTime;

fn callback(event: Event) {
    match event.event_type {
        EventType::ButtonPress(Button::Left) => {
            if let Ok(time) = SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
                let timestamp = time.as_micros();
                println!("左键按下, 时间戳: {}", timestamp)
            } else {
                println!("左键按下")
            }
        }
        EventType::KeyPress(Key::MetaRight) => {
            if let Ok(time) = SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
                let timestamp = time.as_micros();
                println!("MetaRight键按下, 时间戳: {}", timestamp)
            } else {
                println!("MetaRight键按下")
            }
        }
        // EventType::ButtonRelease(Button::Left) => println!("左键释放"),
        _ => (),
    }
}

pub fn test() {
    thread::spawn(|| {
        listen(callback).unwrap();
    });
}
