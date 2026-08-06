import {
    FolderKanban,
    CheckSquare,
    FileText,
    DollarSign,
    Clock,
    Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";

interface ClientStatsProps {
    client: any;
}

export default function ClientStats({
    client,
}: ClientStatsProps) {
    const projects = client.projects ?? [];

    const tasks = projects.flatMap((p: any) => p.tasks ?? []);

    const reports = client.reports ?? [];

    const completedTasks = tasks.filter(
        (t: any) => t.status === "completed"
    ).length;

    const activeTasks = tasks.filter(
        (t: any) =>
            t.status === "active" ||
            t.status === "in-progress"
    ).length;

    return (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
                title="Projects"
                value={projects.length}
                icon={<FolderKanban className="h-6 w-6" />}
                color="bg-blue-50 text-blue-600"
            />

            <StatCard
                title="Tasks"
                value={tasks.length}
                icon={<CheckSquare className="h-6 w-6" />}
                color="bg-emerald-50 text-emerald-600"
            />

            <StatCard
                title="Completed"
                value={completedTasks}
                icon={<CheckSquare className="h-6 w-6" />}
                color="bg-green-50 text-green-600"
            />

            <StatCard
                title="In Progress"
                value={activeTasks}
                icon={<Clock className="h-6 w-6" />}
                color="bg-orange-50 text-orange-600"
            />

            <StatCard
                title="Reports"
                value={reports.length}
                icon={<FileText className="h-6 w-6" />}
                color="bg-purple-50 text-purple-600"
            />

            <StatCard
                title="Invoice"
                value={formatCurrency(
                    Number(client.invoiceValue || 0),
                    client.currency
                )}
                icon={<DollarSign className="h-6 w-6" />}
                color="bg-yellow-50 text-yellow-600"
            />

        </div>
    );
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}

function StatCard({
    title,
    value,
    icon,
    color,
}: StatCardProps) {
    return (
        <Card className="rounded-2xl border-0 shadow-sm hover:shadow-lg transition-all duration-300">

            <div className="p-6">

                <div className="flex items-start justify-between">

                    <div>

                        <p className="text-sm text-zinc-500">
                            {title}
                        </p>

                        <h2 className="mt-2 text-3xl font-bold">
                            {value}
                        </h2>

                    </div>

                    <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
                    >
                        {icon}
                    </div>

                </div>

            </div>

        </Card>
    );
}