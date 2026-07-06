import type { Response } from 'express';

export const successResponse = (res: Response, data: any, message: string = 'Success'): Response => {
    return res.status(200).json({
        success: true,
        message,
        data
    });
}

export const errorResponse = (res: Response, statusCode: number, error: string): Response => {
    return res.status(statusCode).json({
        success: false,
        error
    });
}