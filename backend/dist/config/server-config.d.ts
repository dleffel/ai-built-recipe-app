interface ServerConfig {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
}
declare const config: ServerConfig;
export default config;
