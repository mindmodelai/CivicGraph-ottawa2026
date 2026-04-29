import PersonPageClient from './PersonPageClient';

export async function generateStaticParams() {
  return [
    { id: 'p_grh_concentrated' },
    { id: 'p_nalugwa_victoria' },
    { id: 'p_yeates_glenda' },
  ];
}

export default function PersonPage({ params }: { params: { id: string } }) {
  return <PersonPageClient id={params.id} />;
}
