export interface Shortcut {
  name: string;
  hot_key: string;
}

export interface GlobalConfig {
  shortcuts: Shortcut[];
  test_field: string;
}
