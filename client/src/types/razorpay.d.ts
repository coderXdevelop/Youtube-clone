export interface RazorpayPaymentSuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export interface RazorpayPaymentFailedResponse {
    error?: {
        code?: string;
        description?: string;
        source?: string;
        step?: string;
        reason?: string;
        metadata?: {
            order_id?: string;
            payment_id?: string;
        };
    };
}

export interface RazorpayOptions {
    key: string;
    amount?: number;
    currency?: string;
    name?: string;
    description?: string;
    image?: string;
    order_id?: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    method?: Record<string, boolean>;
    config?: Record<string, unknown>;
    notes?: Record<string, string>;
    theme?: {
        color?: string;
    };
    handler?: (response: RazorpayPaymentSuccessResponse) => void | Promise<void>;
    modal?: {
        ondismiss?: () => void;
        escape?: boolean;
        backdropclose?: boolean;
    };
}

export interface RazorpayInstance {
    open: () => void;
    on: (event: string, handler: (response: RazorpayPaymentFailedResponse) => void) => void;
    close?: () => void;
}

export interface RazorpayConstructor {
    new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
    interface Window {
        Razorpay?: RazorpayConstructor;
    }
}
