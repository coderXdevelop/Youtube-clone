"use client";

import { useRouter } from "next/navigation";
import React, { ChangeEvent, FormEvent, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
/* import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext"; */

interface ChannelData {
    name?: string;
    description?: string;
}

interface ChannelDialogProps {
    isopen: boolean;
    onclose: () => void;
    channeldata?: ChannelData | null;
    mode?: "create" | "edit";
}

const Channeldialogue: React.FC<ChannelDialogProps> = ({
    isopen,
    onclose,
    channeldata,
    mode = "create",
}) => {
    const user: {
        _id: string;
        name: string;
        email: string;
        image: string;
        channelname: string;
    } | null = {
        _id: "1",
        name: "John Doe",
        email: "john@example.com",
        image: "https://github.com/shadcn.png?height=32&width=32",
        channelname: "", // empty means no channel yet
    };

    // const { user, login } = useUser(); // uncomment when backend ready
    const router = useRouter();

    const [prevProps, setPrevProps] = useState<{
        channeldata?: ChannelData | null;
        mode?: string;
        isopen?: boolean;
    }>({ channeldata, mode, isopen });

    const [formData, setFormData] = useState(() => {
        if (channeldata && mode === "edit") {
            return {
                name: channeldata.name || "",
                description: channeldata.description || "",
            };
        }
        return {
            name: user?.name || "",
            description: "",
        };
    });

    if (
        prevProps.channeldata !== channeldata ||
        prevProps.mode !== mode ||
        prevProps.isopen !== isopen
    ) {
        setPrevProps({ channeldata, mode, isopen });
        if (channeldata && mode === "edit") {
            setFormData({
                name: channeldata.name || "",
                description: channeldata.description || "",
            });
        } else {
            setFormData({
                name: user?.name || "",
                description: "",
            });
        }
    }

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            channelname: formData.name,
            description: formData.description,
        };

        // 🔧 TODO: Replace with backend API call
        // const response = await axiosInstance.patch(`/user/update/${user._id}`, payload);
        // login(response?.data);

        console.log("Mock submit payload:", payload);

        // Simulate success
        setTimeout(() => {
            router.push(`/channel/${user?._id}`);
            setFormData({ name: "", description: "" });
            setIsSubmitting(false);
            onclose();
        }, 1000);
    };

    return (
        <Dialog open={isopen} onOpenChange={onclose}>
            <DialogContent className="sm:max-w-md md:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "Create your channel" : "Edit your channel"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Channel Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Channel Name</Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Channel Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Channel Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Tell viewers about your channel..."
                        />
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        <Button type="button" variant="outline" onClick={onclose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? "Saving..."
                                : mode === "create"
                                    ? "Create Channel"
                                    : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default Channeldialogue;
