import BadgeDetailPage from "./badge-detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function Page() {
  return <BadgeDetailPage />;
}
