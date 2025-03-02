import dotenv from "dotenv-safe";

export interface EnvConfig {
    PORT: number;
    MONGO_CONNECTION_STRING: string;
    PASSWORD: string;
    API_BASE_URL: string;
}

export function loadEnv(): EnvConfig {
    dotenv.config({
        example: ".env",
    });

    return {
        PORT: parseInt(process.env.PORT || "3000"),
        MONGO_CONNECTION_STRING: process.env.MONGO_CONNECTION_STRING!,
        PASSWORD: process.env.PASSWORD!,
        API_BASE_URL: process.env.API_BASE_URL!,
    };
}