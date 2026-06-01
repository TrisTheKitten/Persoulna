import { getDashboardData } from "@/src/lib/dashboard";
import HomeClient from "../HomeClient";

export const dynamic = "force-dynamic";

export default async function WritePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams.error;
  const data = await getDashboardData();

  return (
    <HomeClient
      data={data}
      error={error ? String(error) : undefined}
    />
  );
}
