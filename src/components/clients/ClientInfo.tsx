import {
    Building2,
    Globe,
    Mail,
    Phone,
    DollarSign,
    CalendarDays,
    UserRound,
    BadgeCheck,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { formatCurrency } from "@/src/lib/utils";

interface Props {
    client: any;
}

export default function ClientInfo({ client }: Props) {
    return (
        <Card className="rounded-3xl shadow-sm">

            <div className="p-6">

                <div className="mb-6 flex items-center justify-between">

                    <div>

                        <h2 className="text-xl font-bold">
                            Client Information
                        </h2>

                        <p className="text-sm text-zinc-500">
                            Contact & business information
                        </p>

                    </div>

                </div>

                <Separator className="mb-6" />

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                    <InfoCard
                        icon={<UserRound />}
                        label="Client Name"
                        value={client.name}
                    />

                    <InfoCard
                        icon={<Building2 />}
                        label="Company"
                        value={client.company}
                    />

                    <InfoCard
                        icon={<BadgeCheck />}
                        label="Status"
                        value={client.status}
                        capitalize
                    />

                    <InfoCard
                        icon={<Mail />}
                        label="Email"
                        value={client.email}
                        copy
                    />

                    <InfoCard
                        icon={<Phone />}
                        label="Phone"
                        value={client.phone}
                        copy
                    />

                    <InfoCard
                        icon={<Globe />}
                        label="Website"
                        value={client.website}
                        href={`https://${client.website?.replace(/^https?:\/\//, "")}`}
                    />

                    <InfoCard
                        icon={<DollarSign />}
                        label="Invoice Value"
                        value={formatCurrency(
                            Number(client.invoiceValue),
                            client.currency
                        )}
                    />

                    <InfoCard
                        icon={<CalendarDays />}
                        label="Created"
                        value={new Date(
                            client.createdAt
                        ).toLocaleDateString()}
                    />

                    <InfoCard
                        icon={<UserRound />}
                        label="Client UID"
                        value={client.clientUid}
                        mono
                    />

                </div>

                {client.notes && (
                    <>
                        <Separator className="my-6" />

                        <div>

                            <h3 className="font-semibold">
                                Notes
                            </h3>

                            <p className="mt-3 leading-7 text-zinc-600">
                                {client.notes}
                            </p>

                        </div>
                    </>
                )}

            </div>

        </Card>
    );
}

interface InfoCardProps {
    icon: React.ReactNode;
    label: string;
    value?: string;
    href?: string;
    mono?: boolean;
    copy?: boolean;
    capitalize?: boolean;
}

function InfoCard({
    icon,
    label,
    value,
    href,
    mono,
    capitalize,
}: InfoCardProps) {
    return (
        <div className="rounded-2xl border bg-zinc-50 p-5 transition hover:bg-white hover:shadow-md">

            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">

                {icon}

                {label}

            </div>

            {href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-600 hover:underline break-all"
                >
                    {value}
                </a>
            ) : (
                <div
                    className={`font-semibold break-all ${mono ? "font-mono text-sm" : ""
                        } ${capitalize ? "capitalize" : ""
                        }`}
                >
                    {value || "-"}
                </div>
            )}
        </div>
    );
}