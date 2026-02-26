import EntryDetailClient from "./entry-detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function EntryDetailPage() {
  return <EntryDetailClient />;
}
