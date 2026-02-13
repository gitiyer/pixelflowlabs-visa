import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";
import shortid from "shortid";

export async function POST(req: NextRequest) {
    if (req.method !== "POST") {
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error("Razorpay keys are missing in environment variables.");
        return NextResponse.json(
            { error: "Server configuration error: Razorpay keys missing" },
            { status: 500 }
        );
    }

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const payment_capture = 1;
    const amount = 99 * 100; // amount in paisa (₹99)
    const currency = "INR";
    const options = {
        amount: amount.toString(),
        currency,
        receipt: shortid.generate(),
        payment_capture,
    };

    try {
        const response = await razorpay.orders.create(options);
        return NextResponse.json({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to create order" },
            { status: 400 }
        );
    }
}
