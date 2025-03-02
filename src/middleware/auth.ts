import { Request, Response, NextFunction } from "express";

export const authenticate = (password: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authPassword = req.headers["authorization-password"];
        if (authPassword === password) {
            next();
        } else {
            res.status(403).json({ error: "Unauthorized: Incorrect or missing password" });
        }
    };
};