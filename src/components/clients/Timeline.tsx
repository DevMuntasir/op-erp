import {
    CalendarPlus,
    FolderKanban,
    FileText,
    Send,
    Eye,
    ClipboardList,
    Clock3,
} from "lucide-react";

interface TimelineProps {
    client: any;
}

export default function Timeline({
    client,
}: TimelineProps) {
    const activities = [
        {
            title: "Client Created",
            date: client.createdAt,
            icon: <CalendarPlus className="h-5 w-5" />,
            color: "bg-blue-500",
        },

        ...(client.projects ?? []).flatMap((project: any) => [
            {
                title: `Project "${project.title}" created`,
                date: project.createdAt,
                icon: <FolderKanban className="h-5 w-5" />,
                color: "bg-emerald-500",
            },

            ...(project.tasks ?? []).map((task: any) => ({
                title: `Task "${task.title}" created`,
                date: task.createdAt,
                icon: <ClipboardList className="h-5 w-5" />,
                color: "bg-orange-500",
            })),
        ]),

        ...(client.reports ?? []).flatMap((report: any) => [
            {
                title: `Report "${report.projectName}" created`,
                date: report.createdAt,
                icon: <FileText className="h-5 w-5" />,
                color: "bg-violet-500",
            },

            ...(report.sentToClient
                ? [
                    {
                        title: "Report sent to client",
                        date:
                            report.sentToClients?.[0]?.sentAt ??
                            report.updatedAt,
                        icon: <Send className="h-5 w-5" />,
                        color: "bg-emerald-500",
                    },
                ]
                : []),

            ...(report.isViewed
                ? [
                    {
                        title: "Client viewed report",
                        date: report.viewedAt,
                        icon: <Eye className="h-5 w-5" />,
                        color: "bg-sky-500",
                    },
                ]
                : []),
        ]),
    ]
        .filter((x) => x.date)
        .sort(
            (a, b) =>
                new Date(b.date).getTime() -
                new Date(a.date).getTime()
        );

    return (
        <div className="rounded-3xl border bg-white p-6 shadow-sm">

            <div className="mb-6">

                <h2 className="text-xl font-bold">
                    Activity Timeline
                </h2>

                <p className="text-sm text-zinc-500">
                    Recent client activity
                </p>

            </div>

            <div className="relative">

                <div className="absolute left-5 top-0 h-full w-px bg-zinc-200" />

                <div className="space-y-8">

                    {activities.map((item, index) => (
                        <div
                            key={index}
                            className="relative flex gap-5"
                        >
                            <div
                                className={`z-10 flex h-10 w-10 items-center justify-center rounded-full text-white ${item.color}`}
                            >
                                {item.icon}
                            </div>

                            <div className="flex-1 rounded-2xl border bg-zinc-50 p-4">

                                <h3 className="font-semibold">
                                    {item.title}
                                </h3>

                                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                                    <Clock3 className="h-4 w-4" />

                                    {new Date(item.date).toLocaleString()}
                                </div>

                            </div>
                        </div>
                    ))}

                </div>

            </div>

        </div>
    );
}