import { Badge } from "@/components/ui/badge";

interface Props {
    priority: string;
}

export default function PriorityBadge({
    priority,
}: Props) {
    switch (priority) {
        case "high":
            return (
                <Badge className="bg-red-500 hover:bg-red-500">
                    High
                </Badge>
            );

        case "medium":
            return (
                <Badge className="bg-yellow-500 hover:bg-yellow-500">
                    Medium
                </Badge>
            );

        case "low":
            return (
                <Badge className="bg-emerald-500 hover:bg-emerald-500">
                    Low
                </Badge>
            );

        default:
            return (
                <Badge variant="secondary">
                    {priority}
                </Badge>
            );
    }
}