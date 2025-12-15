use rdev::{listen, Event};

pub fn test() {
    // This will block.
    if let Err(error) = listen(callback) {
        println!("Error: {:?}", error)
    }

    fn callback(event: Event) {
        println!("My callback {:?}", event);
        match event.name {
            Some(string) => println!("User wrote {:?}", string),
            None => (),
        }
    }
}
