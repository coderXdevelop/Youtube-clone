import React from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, Download, Printer, Shield, Sparkles } from "lucide-react";
import { format } from "date-fns";

export interface InvoiceData {
    invoiceNumber: string;
    orderId: string;
    paymentId: string;
    date: string | Date;
    plan: string;
    billingcycle: string;
    amount: number;
    currency: string;
    customerName: string;
    customerEmail: string;
    validUntil: string | Date;
    paymentMethod: string;
    status: string;
}

interface InvoiceReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: InvoiceData | null;
}

const InvoiceReceiptModal = ({
    isOpen,
    onClose,
    invoice,
}: InvoiceReceiptModalProps) => {
    if (!invoice) return null;

    const formattedDate = format(new Date(invoice.date), "MMMM dd, yyyy");
    const formattedExpiry = format(new Date(invoice.validUntil), "MMMM dd, yyyy");
    const subtotal = Math.round(invoice.amount / 1.18);
    const taxGst = invoice.amount - subtotal;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 print:p-0 print:border-none print:shadow-none">
                <DialogHeader className="border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    Payment Receipt & Invoice
                                </DialogTitle>
                                <p className="text-xs text-gray-500">Official tax invoice for your subscription</p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            PAID
                        </span>
                    </div>
                </DialogHeader>

                {/* Printable Invoice Body */}
                <div id="printable-invoice" className="space-y-4 text-xs text-gray-700 dark:text-gray-300 pt-2">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-gray-100 dark:border-zinc-800">
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Invoice Number</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Order ID</span>
                            <span className="font-mono text-gray-800 dark:text-gray-200">{invoice.orderId}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Payment ID</span>
                            <span className="font-mono text-gray-800 dark:text-gray-200">{invoice.paymentId}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Invoice Date</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{formattedDate}</span>
                        </div>
                    </div>

                    {/* Customer & Plan Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Billed To:</span>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.customerName}</p>
                            <p className="text-gray-500">{invoice.customerEmail}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Subscription Details:</span>
                            <p className="font-semibold text-indigo-600 dark:text-indigo-400">{invoice.plan} Plan ({invoice.billingcycle})</p>
                            <p className="text-gray-500">Valid until: {formattedExpiry}</p>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-zinc-800/60 text-gray-500 text-[11px] border-b border-gray-200 dark:border-zinc-800">
                                <tr>
                                    <th className="p-2.5 font-semibold">Description</th>
                                    <th className="p-2.5 font-semibold text-center">Cycle</th>
                                    <th className="p-2.5 font-semibold text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                                <tr>
                                    <td className="p-2.5">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            YouTube Clone {invoice.plan} Membership
                                        </div>
                                        <div className="text-[11px] text-gray-400">
                                            High quality streaming, downloads, ad-free access
                                        </div>
                                    </td>
                                    <td className="p-2.5 text-center capitalize text-gray-600 dark:text-gray-400">
                                        {invoice.billingcycle}
                                    </td>
                                    <td className="p-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                                        ₹{subtotal.toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Breakdown & Total */}
                    <div className="space-y-1.5 pt-1 pl-32">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal (Base Price):</span>
                            <span>₹{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                            <span>GST / Taxes (18% Included):</span>
                            <span>₹{taxGst.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-zinc-800 pt-2">
                            <span>Total Amount Paid:</span>
                            <span className="text-indigo-600 dark:text-indigo-400">₹{invoice.amount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="text-[11px] text-gray-400 flex items-center justify-between border-t border-gray-100 dark:border-zinc-800 pt-3">
                        <span className="flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            Processed securely via Razorpay Test Gateway
                        </span>
                        <span>Thank you for subscribing!</span>
                    </div>
                </div>

                <DialogFooter className="flex justify-end gap-2 pt-2 print:hidden">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="text-xs"
                    >
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        Print / PDF
                    </Button>
                    <Button
                        size="sm"
                        onClick={onClose}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default InvoiceReceiptModal;
