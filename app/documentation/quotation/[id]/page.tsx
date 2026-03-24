import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function DocumentationQuotationRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/documentation?id=${encodeURIComponent(id)}`);
}
