import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ArrowLeft } from "lucide-react";

import { getClient } from "@/src/api/endpoints/clients.api";
import { useEmployees } from "@/src/hooks/useApiQueries";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ClientHero from "./ClientHero";
import ClientStats from "./ClientStats";
import ClientInfo from "./ClientInfo";
import ProjectCard from "./ProjectCard";
import ReportCard from "./ReportCard";
import Timeline from "./Timeline";

export default function ClientDetailPage() {
    const { clientId } = useParams<{
        clientId: string;
    }>();

    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery({
        queryKey: ["client", clientId],

        enabled: !!clientId,

        queryFn: async () => {
            if (!clientId) throw new Error("Missing Client ID");

            return getClient(clientId);
        },
    });

    const client = data ?? null;

    const employeesQuery = useEmployees();

    const employees = employeesQuery.data ?? [];

    const employeeMap = useMemo(() => {
        return new Map(
            employees.map((emp: any) => [emp.uid, emp])
        );
    }, [employees]);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                Loading Client...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                Failed to load client.
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                Client not found.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-100">

            <div className="mx-auto max-w-7xl space-y-8 p-6">

                {/* Back */}

                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />

                    Back

                </Button>

                {/* Hero */}

                <ClientHero client={client} />

                {/* Stats */}

                <ClientStats client={client} />

                {/* Tabs */}

                <Tabs
                    defaultValue="overview"
                    className="space-y-6"
                >
                    <TabsList className="grid w-full grid-cols-4">

                        <TabsTrigger value="overview">
                            Overview
                        </TabsTrigger>

                        <TabsTrigger value="projects">
                            Projects ({client.projects?.length ?? 0})
                        </TabsTrigger>

                        <TabsTrigger value="reports">
                            Reports ({client.reports?.length ?? 0})
                        </TabsTrigger>

                        <TabsTrigger value="activity">
                            Activity
                        </TabsTrigger>

                    </TabsList>          {/* OVERVIEW */}

                    <TabsContent
                        value="overview"
                        className="space-y-8"
                    >
                        <ClientInfo client={client} />
                    </TabsContent>

                    {/* PROJECTS */}

                    <TabsContent
                        value="projects"
                        className="space-y-6"
                    >
                        {client.projects?.length ? (
                            client.projects.map((project: any) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    employeeMap={employeeMap}
                                />
                            ))
                        ) : (
                            <div className="rounded-2xl border bg-white p-12 text-center text-zinc-500">
                                No projects found.
                            </div>
                        )}
                    </TabsContent>

                    {/* REPORTS */}

                    <TabsContent
                        value="reports"
                        className="space-y-6"
                    >
                        {client.reports?.length ? (
                            client.reports.map((report: any) => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                />
                            ))
                        ) : (
                            <div className="rounded-2xl border bg-white p-12 text-center text-zinc-500">
                                No reports found.
                            </div>
                        )}
                    </TabsContent>

                    {/* ACTIVITY */}

                    <TabsContent value="activity">
                        <Timeline client={client} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}