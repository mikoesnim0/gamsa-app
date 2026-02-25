import GratitudePageView from "./gratitude-page-view";

export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function Page() {
  return <GratitudePageView />;
}
