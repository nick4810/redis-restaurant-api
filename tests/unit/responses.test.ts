import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { successResponse, errorResponse } from "../../utils/responses.js";

const mockRes = () =>
    ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    }) as unknown as Response;

describe("successResponse", () => {
    it("sends a 200 with the success payload", () => {
        const res = mockRes();
        successResponse(res, { id: "1" }, "Created");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Created",
            data: { id: "1" },
        });
    });

    it("defaults message to 'Success'", () => {
        const res = mockRes();
        successResponse(res, null);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Success" })
        );
    });

    it("returns the response object", () => {
        const res = mockRes();
        const result = successResponse(res, {});
        expect(result).toBe(res);
    });
});

describe("errorResponse", () => {
    it("sends the specified status code with error payload", () => {
        const res = mockRes();
        errorResponse(res, 404, "Not found");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: "Not found",
        });
    });

    it("works for 400 bad request", () => {
        const res = mockRes();
        errorResponse(res, 400, "Bad request");
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns the response object", () => {
        const res = mockRes();
        const result = errorResponse(res, 500, "Error");
        expect(result).toBe(res);
    });
});
