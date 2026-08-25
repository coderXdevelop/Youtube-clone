import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ShieldCheck, RefreshCw } from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";

interface CommentCaptchaDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialCaptcha: { token: string; question: string } | null;
    onVerified: (token: string, answer: string) => void;
}

const CommentCaptchaDialog = ({
    isOpen,
    onClose,
    initialCaptcha,
    onVerified,
}: CommentCaptchaDialogProps) => {
    const [captcha, setCaptcha] = useState<{ token: string; question: string } | null>(initialCaptcha);
    const [answer, setAnswer] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync incoming initial captcha
    const [prevInitial, setPrevInitial] = useState<{ token: string; question: string } | null>(null);
    if (initialCaptcha && initialCaptcha.token !== prevInitial?.token) {
        setPrevInitial(initialCaptcha);
        setCaptcha(initialCaptcha);
        setAnswer("");
        setError(null);
    }

    const refreshCaptcha = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axiosInstance.get("/api/comment/captcha/generate");
            if (res.data) {
                setCaptcha(res.data);
                setAnswer("");
            }
        } catch {
            setError("Failed to generate new challenge. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (!captcha?.token || !answer.trim()) {
            setError("Please enter your answer.");
            return;
        }

        // Pass back token and answer to resume comment posting
        onVerified(captcha.token, answer.trim());
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <ShieldCheck className="w-5 h-5" />
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Security Verification
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <p className="text-xs text-gray-600 dark:text-gray-300">
                    To prevent automated comment flooding and maintain community quality, please solve this quick verification problem:
                </p>

                <form onSubmit={handleVerify} className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
                        <div className="text-base font-semibold text-indigo-950 dark:text-indigo-200 tracking-wide font-mono">
                            {captcha?.question || "Loading challenge..."}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={refreshCaptcha}
                            disabled={isLoading}
                            className="h-8 px-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="captchaAnswer" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Your Answer
                        </Label>
                        <Input
                            id="captchaAnswer"
                            type="text"
                            placeholder="Enter number..."
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            autoFocus
                            className="text-sm font-medium"
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                            {error}
                        </p>
                    )}

                    <DialogFooter className="flex gap-2 justify-end pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!answer.trim()}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4"
                        >
                            Verify & Post
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CommentCaptchaDialog;
