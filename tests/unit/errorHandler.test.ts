import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../middlewares/errorHandler.js";

const mockRes = () =>
    ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    }) as unknown as Response;

describe("errorHandler", () => {
    it("responds with 500 and passes the error to errorResponse", () => {
        const err = new Error("Something exploded");
        const res = mockRes();
        const next = vi.fn() as NextFunction;

        errorHandler(err, {} as Request, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
    });

    it("handles non-Error objects", () => {
        const res = mockRes();
        errorHandler("raw string error", {} as Request, res, vi.fn());
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
