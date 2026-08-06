import {
    CalendarDays,
    User,
    Paperclip,
    AlertTriangle,
    Clock3,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";

interface TaskCardProps {
    task: any;
    employeeMap: Map<string, any>;
}

export default function TaskCard({
    task,
    employeeMap,
}: TaskCardProps) {
    const assignedEmployees =
        task.assignedEmployees?.length > 0
            ? task.assignedEmployees
            : task.assignedTo
                ? [task.assignedTo]
                : [];

    const isOverdue =
        task.dueDate &&
        new Date(task.dueDate).getTime() < Date.now() &&
        task.status !== "completed";

    return (
        <Card
            className={`group overflow-hidden rounded-2xl border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${task.priority === "high"
                    ? "border-l-red-500"
                    : task.priority === "medium"
                        ? "border-l-yellow-500"
                        : "border-l-emerald-500"
                }`}
        >
            <div className="p-5">

                {/* Header */}

                <div className="flex items-start justify-between gap-4">

                    <div className="flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-lg font-semibold">
                                {task.title}
                            </h3>

                            <PriorityBadge priority={task.priority} />

                            <StatusBadge status={task.status} />

                        </div>

                        {task.description && (
                            <p className="mt-3 text-sm leading-6 text-zinc-600">
                                {task.description}
                            </p>
                        )}
                    </div>

                </div>

                {/* Bottom */}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-5">

                    {/* Employee */}

                    <div className="flex items-center gap-3">

                        {assignedEmployees.length > 0 ? (
                            assignedEmployees.map((id: string) => {
                                const emp = employeeMap.get(id);

                                if (!emp) return null;

                                return (
                                    <div
                                        key={id}
                                        className="flex items-center gap-2"
                                    >
                                        <Avatar className="h-9 w-9">

                                            <AvatarImage
                                                src={emp.photoURL}
                                            />

                                            <AvatarFallback>
                                                {emp.name?.charAt(0)}
                                            </AvatarFallback>

                                        </Avatar>

                                        <div>

                                            <p className="text-sm font-medium">
                                                {emp.name}
                                            </p>

                                            <p className="text-xs text-zinc-500">
                                                Assigned
                                            </p>

                                        </div>

                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex items-center gap-2 text-zinc-500">

                                <User className="h-4 w-4" />

                                Unassigned

                            </div>
                        )}

                    </div>

                    {/* Right Side */}

                    <div className="flex flex-wrap items-center gap-5">

                        {task.dueDate && (
                            <div
                                className={`flex items-center gap-2 text-sm ${isOverdue
                                        ? "text-red-600"
                                        : "text-zinc-500"
                                    }`}
                            >
                                <CalendarDays className="h-4 w-4" />

                                {new Date(
                                    task.dueDate
                                ).toLocaleDateString()}

                            </div>
                        )}

                        {task.submission ? (
                            <Badge
                                variant="secondary"
                                className="gap-2"
                            >
                                <Paperclip className="h-3 w-3" />

                                Submitted

                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="gap-2"
                            >
                                <Clock3 className="h-3 w-3" />

                                Waiting
                            </Badge>
                        )}

                        {isOverdue && (
                            <Badge className="gap-2 bg-red-500">

                                <AlertTriangle className="h-3 w-3" />

                                Overdue

                            </Badge>
                        )}

                    </div>

                </div>

            </div>
        </Card>
    );
}