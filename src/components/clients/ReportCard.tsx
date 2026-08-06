import {
    CalendarDays,
    Eye,
    EyeOff,
    FileText,
    Download,
    ExternalLink,
    Images,
    Send,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReportCardProps {
    report: any;
}

export default function ReportCard({
    report,
}: ReportCardProps) {
    return (
        <Card className="overflow-hidden rounded-3xl shadow-sm">

            {/* Header */}

            <div className="border-b bg-gradient-to-r from-slate-50 to-white p-6">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div>

                        <div className="flex items-center gap-3">

                            <div className="rounded-xl bg-blue-100 p-3">

                                <FileText className="h-6 w-6 text-blue-600" />

                            </div>

                            <div>

                                <h2 className="text-xl font-bold">
                                    {report.projectName}
                                </h2>

                                <p className="mt-1 text-sm text-zinc-500">
                                    {report.reportingPeriod}
                                </p>

                            </div>

                        </div>

                    </div>

                    <div className="flex flex-wrap gap-2">

                        {report.sentToClient ? (
                            <Badge className="bg-emerald-500">
                                <Send className="mr-1 h-3 w-3" />
                                Sent
                            </Badge>
                        ) : (
                            <Badge variant="outline">
                                Draft
                            </Badge>
                        )}

                        {report.isViewed ? (
                            <Badge className="bg-blue-500">
                                <Eye className="mr-1 h-3 w-3" />
                                Viewed
                            </Badge>
                        ) : (
                            <Badge variant="secondary">
                                <EyeOff className="mr-1 h-3 w-3" />
                                Not Viewed
                            </Badge>
                        )}

                    </div>

                </div>

                {/* Meta */}

                <div className="mt-6 grid gap-4 md:grid-cols-3">

                    <InfoItem
                        label="Created"
                        value={new Date(
                            report.createdAt
                        ).toLocaleDateString()}
                        icon={<CalendarDays className="h-4 w-4" />}
                    />

                    <InfoItem
                        label="Status"
                        value={report.status}
                    />

                    <InfoItem
                        label="Period"
                        value={report.reportingPeriod}
                    />

                </div>

            </div>

            {/* Notes */}

            {report.employeeNotes && (
                <div className="border-b p-6">

                    <h3 className="mb-2 font-semibold">
                        Employee Notes
                    </h3>

                    <p className="leading-7 text-zinc-600">
                        {report.employeeNotes}
                    </p>

                </div>
            )}

            {/* Markdown */}

            {report.contentMd && (
                <div className="border-b p-6">

                    <h3 className="mb-5 text-lg font-bold">
                        Report Preview
                    </h3>

                    <article className="prose prose-zinc max-w-none">

                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {report.contentMd}
                        </ReactMarkdown>

                    </article>

                </div>
            )}

            {/* Screenshots */}

            {report.screenshotUrls?.length > 0 && (

                <div className="border-b p-6">

                    <div className="mb-5 flex items-center gap-2">

                        <Images className="h-5 w-5" />

                        <h3 className="text-lg font-semibold">

                            Screenshots

                        </h3>

                    </div>

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

                        {report.screenshotUrls.map(
                            (image: string) => (

                                <a
                                    key={image}
                                    href={image}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group overflow-hidden rounded-2xl"
                                >

                                    <img
                                        src={image}
                                        alt=""
                                        className="aspect-video w-full rounded-2xl object-cover transition duration-300 group-hover:scale-105"
                                    />

                                </a>

                            )
                        )}

                    </div>

                </div>

            )}

            {/* Actions */}

            <div className="flex flex-wrap gap-4 p-6">

                <Button asChild>

                    <a
                        href={report.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />

                        Open PDF

                    </a>

                </Button>

                <Button
                    variant="outline"
                    asChild
                >

                    <a
                        href={report.pdfUrl}
                        download
                    >

                        <Download className="mr-2 h-4 w-4" />

                        Download

                    </a>

                </Button>

            </div>

        </Card>
    );
}

function InfoItem({
    label,
    value,
    icon,
}: {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-zinc-50 p-4">

            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">

                {icon}

                {label}

            </div>

            <div className="font-semibold">

                {value}

            </div>

        </div>
    );
}