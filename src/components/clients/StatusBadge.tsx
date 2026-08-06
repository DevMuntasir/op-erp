import { Badge } from "@/components/ui/badge";

interface Props {
    status: string;
}

const styles: Record<string, string> = {
    active: "bg-emerald-500",
    completed: "bg-green-600",
    pending: "bg-yellow-500",
    review: "bg-violet-500",
    cancelled: "bg-red-500",
    "in-progress": "bg-blue-500",
};

export default function StatusBadge({
    status,
}: Props) {
    return (
        <Badge
            className={
                styles[status] ??
                "bg-zinc-500"
            }
        >
            {status}
        </Badge>
    );
}