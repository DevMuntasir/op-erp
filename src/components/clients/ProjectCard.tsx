import { useState } from "react";
import {
    Calendar,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Clock3,
    ListTodo,
    FolderKanban,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import TaskCard from "./TaskCard";

interface ProjectCardProps {
    project: any;
    employeeMap: Map<string, any>;
}

export default function ProjectCard({
    project,
    employeeMap,
}: ProjectCardProps) {
    const [expanded, setExpanded] = useState(true);

    const tasks = project.tasks ?? [];

    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
        (t: any) => t.status === "completed"
    ).length;

    const inProgressTasks = tasks.filter(
        (t: any) => t.status === "in-progress"
    ).length;

    const progress =
        totalTasks === 0
            ? 0
            : Math.round((completedTasks / totalTasks) * 100);

    return (
        <Card className="overflow-hidden rounded-3xl border shadow-sm">

            {/* Header */}

            <div className="border-b bg-zinc-50 p-6">

                <div className="flex items-start justify-between">

                    <div>

                        <div className="flex items-center gap-3">

                            <div className="rounded-xl bg-emerald-100 p-3">

                                <FolderKanban className="h-6 w-6 text-emerald-600" />

                            </div>

                            <div>

                                <h2 className="text-xl font-bold">
                                    {project.title}
                                </h2>

                                <p className="mt-1 text-sm text-zinc-500">
                                    {project.description}
                                </p>

                            </div>

                        </div>

                    </div>

                    <div className="flex items-center gap-3">

                        <StatusBadge status={project.status} />

                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? (
                                <ChevronUp className="h-5 w-5" />
                            ) : (
                                <ChevronDown className="h-5 w-5" />
                            )}
                        </Button>

                    </div>

                </div>

                {/* Stats */}

                <div className="mt-6 grid gap-4 md:grid-cols-4">

                    <SmallStat
                        icon={<ListTodo className="h-5 w-5" />}
                        label="Tasks"
                        value={totalTasks}
                    />

                    <SmallStat
                        icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
                        label="Completed"
                        value={completedTasks}
                    />

                    <SmallStat
                        icon={<Clock3 className="h-5 w-5 text-orange-600" />}
                        label="In Progress"
                        value={inProgressTasks}
                    />

                    <SmallStat
                        icon={<Calendar className="h-5 w-5" />}
                        label="Created"
                        value={new Date(
                            project.createdAt
                        ).toLocaleDateString()}
                    />

                </div>

                {/* Progress */}

                <div className="mt-6">

                    <div className="mb-2 flex justify-between text-sm">

                        <span className="text-zinc-500">
                            Progress
                        </span>

                        <span className="font-semibold">
                            {progress}%
                        </span>

                    </div>

                    <div className="h-2 rounded-full bg-zinc-200">

                        <div
                            className="h-2 rounded-full bg-emerald-500 transition-all"
                            style={{
                                width: `${progress}%`,
                            }}
                        />

                    </div>

                </div>

            </div>

            {/* Tasks */}

            {expanded && (

                <div className="space-y-4 p-6">

                    {tasks.length === 0 ? (

                        <div className="rounded-xl border border-dashed py-10 text-center text-zinc-500">

                            No tasks available

                        </div>

                    ) : (

                        tasks.map((task: any) => (

                            <TaskCard
                                key={task.id}
                                task={task}
                                employeeMap={employeeMap}
                            />

                        ))

                    )}

                </div>

            )}

        </Card>
    );
}

interface SmallStatProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}

function SmallStat({
    icon,
    label,
    value,
}: SmallStatProps) {
    return (
        <div className="rounded-xl border bg-white p-4">

            <div className="flex items-center gap-2 text-zinc-500">

                {icon}

                <span className="text-sm">
                    {label}
                </span>

            </div>

            <div className="mt-2 text-xl font-bold">

                {value}

            </div>

        </div>
    );
}