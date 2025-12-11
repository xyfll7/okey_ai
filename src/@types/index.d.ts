interface Shortcut {
  name: string;
  hot_key: string;
}

interface GlobalConfig {
  shortcuts: Shortcut[];
  test_field: string;
}