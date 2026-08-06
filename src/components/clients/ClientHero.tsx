import {
    Building2,
    CalendarDays,
    Globe,
    Mail,
    Phone,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { formatCurrency } from "@/src/lib/utils";

interface ClientHeroProps {
    client: any;
}

export default function ClientHero({
    client,
}: ClientHeroProps) {
    return (
        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">

            {/* Cover */}
            {/* <div className="h-36 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" /> */}

            <div className="p-8">

                {/* Avatar & Header */}
                <div className=" flex flex-col justify-between gap-6 lg:flex-row">

                    <div className="flex gap-5">

                        <Avatar className="h-28 w-28 border-4 border-white shadow-lg">

                            <AvatarImage src={client.avatar} />

                            <AvatarFallback className="text-3xl font-bold bg-emerald-100 text-emerald-700">

                                {client.name
                                    ?.split(" ")
                                    ?.map((x: string) => x[0])
                                    ?.join("")}

                            </AvatarFallback>

                        </Avatar>

                        <div>

                            <h1 className="text-3xl font-bold">
                                {client.name}
                            </h1>

                            <div className="mt-2 flex items-center gap-2 text-zinc-500">

                                <Building2 className="h-4 w-4" />

                                {client.company}

                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">

                                <Badge
                                    className={
                                        client.status === "active"
                                            ? "bg-emerald-500"
                                            : "bg-red-500"
                                    }
                                >
                                    {client.status}
                                </Badge>

                                <Badge variant="outline">
                                    {client.currency}
                                </Badge>

                                <Badge variant="secondary">
                                    {formatCurrency(
                                        Number(client.invoiceValue),
                                        client.currency
                                    )}
                                </Badge>

                            </div>

                        </div>

                    </div>

                    {/* Actions */}

                    <div className="flex flex-wrap gap-3">

                        <Button>
                            Edit Client
                        </Button>

                        <Button variant="outline">
                            New Project
                        </Button>

                    </div>

                </div>

                {/* Information Grid */}

                <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

                    <InfoItem
                        icon={<Mail className="h-5 w-5" />}
                        title="Email"
                        value={client.email}
                    />

                    <InfoItem
                        icon={<Phone className="h-5 w-5" />}
                        title="Phone"
                        value={client.phone}
                    />

                    <InfoItem
                        icon={<Globe className="h-5 w-5" />}
                        title="Website"
                        value={client.website}
                        link={
                            client.website
                                ? `https://${client.website.replace(/^https?:\/\//, "")}`
                                : undefined
                        }
                    />

                    <InfoItem
                        icon={<CalendarDays className="h-5 w-5" />}
                        title="Created"
                        value={new Date(
                            client.createdAt
                        ).toLocaleDateString()}
                    />

                </div>

            </div>

        </div>
    );
}

interface InfoItemProps {
    icon: React.ReactNode;
    title: string;
    value?: string;
    link?: string;
}

function InfoItem({
    icon,
    title,
    value,
    link,
}: InfoItemProps) {
    return (
        <div className="rounded-2xl border bg-zinc-50 p-5">

            <div className="flex items-center gap-2 text-zinc-500">

                {icon}

                <span className="text-sm">
                    {title}
                </span>

            </div>

            {link ? (
                <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block font-semibold text-emerald-600 hover:underline"
                >
                    {value}
                </a>
            ) : (
                <div className="mt-2 font-semibold break-all">
                    {value || "-"}
                </div>
            )}
        </div>
    );
}