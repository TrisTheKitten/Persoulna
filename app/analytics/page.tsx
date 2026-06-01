import { getDashboardData } from "@/src/lib/dashboard";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const errorParam = searchParams.error;
  const errorMessage = errorParam ? decodeURIComponent(String(errorParam)) : null;

  const data = await getDashboardData();

  return (
    <AnalyticsClient data={data} initialErrorMessage={errorMessage} />
  );
}

