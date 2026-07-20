import { HelpTrackList } from "@/components/help/help-track-list";
import { getTrack } from "@/lib/help/catalog";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ track: string }>;
};

export default async function HelpTrackPage({ params }: Props) {
  const { track } = await params;
  if (!getTrack(track)) notFound();
  return <HelpTrackList trackId={track} />;
}
