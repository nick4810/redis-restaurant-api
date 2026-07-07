import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { validate } from "../../middlewares/validate.js";
import { RestaurantSchema } from "../../schemas/restaurant.js";
import { ReviewSchema } from "../../schemas/review.js";

const mockRes = () =>
    ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    }) as unknown as Response;

describe("validate middleware", () => {
    let next: NextFunction;

    beforeEach(() => {
        next = vi.fn();
    });

    describe("with RestaurantSchema", () => {
        const middleware = validate(RestaurantSchema);

        it("calls next() for a valid request body", () => {
            const req = {
                body: { name: "Pasta Palace", location: "40.7,-74.0", cuisines: ["Italian"] },
            } as Request;
            middleware(req, mockRes(), next);
            expect(next).toHaveBeenCalledOnce();
        });

        it("returns 400 for an invalid body and does not call next()", () => {
            const res = mockRes();
            const req = { body: { name: "" } } as Request;
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errors: expect.any(Array) })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it("returns 400 for an empty body", () => {
            const res = mockRes();
            const req = { body: {} } as Request;
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("with ReviewSchema", () => {
        const middleware = validate(ReviewSchema);

        it("calls next() for a valid review body", () => {
            const req = { body: { review: "Delicious!", rating: 5 } } as Request;
            middleware(req, mockRes(), next);
            expect(next).toHaveBeenCalledOnce();
        });

        it("returns 400 when rating is out of range", () => {
            const res = mockRes();
            const req = { body: { review: "Too good", rating: 10 } } as Request;
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
