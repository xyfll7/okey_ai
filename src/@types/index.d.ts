export interface Shortcut {
  name: string;
  hot_key: string;
}

export interface GlobalConfig {
  shortcuts: Shortcut[];
}


export interface APIConfig {
  api_key: string;
  base_url: string;
  model: string;
  index: number;
}

export interface ModelConfigMap {
  [key: string]: APIConfig;
}


